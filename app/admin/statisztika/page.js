import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { conversion, dailySeries, PERIODS, periodRange, topList } from "@/lib/stats";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ANALYTICS_ERRORS, loadVisitorStats } from "@/lib/vercel-analytics";

export const dynamic = "force-dynamic";

const num = (n) => new Intl.NumberFormat("hu-HU").format(n);
const regionName = new Intl.DisplayNames(["hu"], { type: "region" });
const country = (code) => {
  try {
    return regionName.of(code);
  } catch {
    return code;
  }
};
const DEVICES = { desktop: "Számítógép", mobile: "Mobil", tablet: "Tablet" };
const shortDate = (d) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}.`;

function Kpi({ label, value, sub }) {
  return (
    <div className="bg-white border border-line/70 rounded-lg px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-bold text-navy-2 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Top({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <div className="bg-white border border-line/70 rounded-lg px-5 py-4">
      <p className="font-bold mb-3">{title}</p>
      {rows.length === 0 && <p className="text-sm text-muted">Nincs adat.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="truncate">{r.label}</span>
              <span className="tabular-nums text-muted shrink-0">{num(r.visitors)}</span>
            </div>
            <div className="h-1.5 bg-line/40 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-navy-2 rounded-full" style={{ width: `${(r.visitors / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DailyChart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.visitors));
  const every = Math.ceil(series.length / 7);
  return (
    <div className="bg-white border border-line/70 rounded-lg px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="font-bold">Naponta</p>
        <p className="text-sm text-muted flex gap-4">
          <span><span className="inline-block w-3 h-3 rounded-sm bg-navy-2 align-middle mr-1" />Látogatók</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-gold align-middle mr-1" />Jelentkezések</span>
        </p>
      </div>
      <div className="flex items-end gap-px h-40">
        {series.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.visitors} látogató, ${d.pageviews} oldalmegtekintés, ${d.registrations} jelentkezés`}
            className="flex-1 h-full flex flex-col justify-end"
          >
            <div className="bg-navy-2 rounded-t-sm" style={{ height: `${(d.visitors / max) * 100}%` }} />
            {d.registrations > 0 && <div className="bg-gold h-1.5 mt-px" />}
          </div>
        ))}
      </div>
      <div className="flex gap-px mt-1">
        {series.map((d, i) => (
          <span key={d.date} className="flex-1 text-xs text-muted text-center overflow-visible whitespace-nowrap">
            {i % every === 0 ? shortDate(d.date) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function Statisztika({ searchParams }) {
  await requireAdmin();
  const range = periodRange(Number((await searchParams).napok));

  const [visitors, regsRes] = await Promise.all([
    loadVisitorStats(range),
    getSupabaseAdmin()
      .from("registrations")
      .select("created_at, tickets(count)")
      .neq("status", "cancelled")
      .gte("created_at", `${range.since}T00:00:00Z`),
  ]);
  if (regsRes.error) throw new Error(regsRes.error.message);
  const regs = regsRes.data;
  const tickets = regs.reduce((a, r) => a + (r.tickets?.[0]?.count ?? 0), 0);
  const ok = !visitors.error;
  const series = dailySeries(range.dates, ok ? visitors.daily : [], regs);
  const conv = ok ? conversion(regs.length, visitors.total.visitors) : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-gold text-3xl">Statisztika</h1>
        <nav className="flex gap-1 bg-white border border-line/70 rounded-md p-1">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/statisztika?napok=${p}`}
              aria-current={p === range.days ? "page" : undefined}
              className={`px-3 py-1.5 rounded text-sm font-bold ${p === range.days ? "bg-navy-2 text-white" : "text-navy-2 hover:bg-gold-soft"}`}
            >
              {p} nap
            </Link>
          ))}
        </nav>
      </div>

      {!ok && (
        <p className="mb-6 rounded-md border border-sold bg-sold-soft text-sold px-4 py-3 text-sm font-semibold">
          {ANALYTICS_ERRORS[visitors.error]} A jelentkezési adatok lent így is látszanak.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Látogatók" value={ok ? num(visitors.total.visitors) : "–"} sub={ok ? `${num(visitors.total.pageviews)} oldalmegtekintés` : null} />
        <Kpi label="Jelentkezések" value={num(regs.length)} sub="lemondottak nélkül" />
        <Kpi label="Eladott jegyek" value={num(tickets)} />
        <Kpi label="Konverzió" value={conv === null ? "–" : `${conv.toLocaleString("hu-HU")}%`} sub="jelentkezés / látogató" />
      </div>

      <div className="mt-6">
        <DailyChart series={series} />
      </div>

      {ok && (
        <div className="grid md:grid-cols-2 gap-3 mt-6">
          <Top title="Honnan jöttek" rows={topList(visitors.referrers, "referrerHostname", "Közvetlen / ismeretlen")} />
          <Top title="Kampány (UTM forrás)" rows={topList(visitors.utm, "utmSource", "Nincs UTM")} />
          <Top title="Oldalak" rows={topList(visitors.pages, "requestPath")} />
          <Top title="Eszköz" rows={topList(visitors.devices, "deviceType").map((r) => ({ ...r, label: DEVICES[r.label] ?? r.label }))} />
          <Top title="Ország" rows={topList(visitors.countries, "country").map((r) => ({ ...r, label: country(r.label) }))} />
        </div>
      )}

      <p className="text-xs text-muted mt-6">
        Látogatói adatok: Vercel Web Analytics (csak a nyilvános oldalak, az admin nem számít bele). Napok UTC szerint.
      </p>
    </>
  );
}
