import Link from "next/link";
import StatsChart from "@/components/admin/StatsChart";
import { requireAdmin } from "@/lib/admin-auth";
import { dailySeries, PERIODS, periodRange, topList } from "@/lib/stats";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ANALYTICS_ERRORS, loadVisitorStats } from "@/lib/vercel-analytics";

export const dynamic = "force-dynamic";

const num = (n) => new Intl.NumberFormat("hu-HU").format(n);
const huf = (n) => `${num(n)} Ft`;
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

export default async function Statisztika({ searchParams }) {
  await requireAdmin();
  const range = periodRange(Number((await searchParams).napok));

  const [visitors, regsRes] = await Promise.all([
    loadVisitorStats(range),
    getSupabaseAdmin()
      .from("registrations")
      .select("created_at, paid_at, total, tickets(count)")
      .neq("status", "cancelled")
      // Registered or paid in the period (an older registration can be paid now).
      .or(`created_at.gte.${range.since}T00:00:00Z,paid_at.gte.${range.since}T00:00:00Z`),
  ]);
  if (regsRes.error) throw new Error(regsRes.error.message);
  const from = `${range.since}T00:00:00Z`;
  const inPeriod = (ts) => ts && new Date(ts) >= new Date(from);
  const regs = regsRes.data.filter((r) => inPeriod(r.created_at));
  const paid = regsRes.data.filter((r) => inPeriod(r.paid_at));
  const tickets = regs.reduce((a, r) => a + (r.tickets?.[0]?.count ?? 0), 0);
  const paidAmount = paid.reduce((a, r) => a + (r.total ?? 0), 0);
  const ok = !visitors.error;
  const series = dailySeries(range.dates, ok ? visitors.daily : [], regsRes.data);

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
          {ANALYTICS_ERRORS[visitors.error]}
          {visitors.status ? ` (HTTP ${visitors.status})` : ""} A jelentkezési és fizetési adatok lent így is látszanak.
        </p>
      )}

      <StatsChart
        series={series}
        defaultOn={ok ? ["visitors", "registrations"] : ["registrations", "payments"]}
        metrics={[
          { key: "visitors", label: "Látogatók", color: "#13336d", value: ok ? num(visitors.total.visitors) : "–", sub: ok ? `${num(visitors.total.pageviews)} oldalmegtekintés` : "nincs adat" },
          { key: "registrations", label: "Jelentkezések", color: "#b8932a", value: num(regs.length), sub: `${num(tickets)} jegy · lemondottak nélkül` },
          { key: "payments", label: "Fizetések", color: "#2e7d4f", value: num(paid.length), sub: huf(paidAmount) },
        ]}
      />

      {ok && (
        <div className="grid md:grid-cols-2 gap-3 mt-6">
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
