import { requireAdmin } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import CapacityForm from "@/components/admin/CapacityForm";

export const dynamic = "force-dynamic";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";

// Gmail allows ~500 recipients per rolling 24 h; warn well before that.
const EMAIL_WARN = 400;

// CSS-only tooltip: hover on desktop, tap (focus) on mobile. Spans the card (positioned by Kpi), so it never leaves the screen.
function Info({ text }) {
  return (
    <span className="group inline-flex align-middle ml-1.5">
      <button
        type="button"
        aria-label={text}
        className="w-4 h-4 rounded-full border border-muted text-muted text-xs font-bold leading-none inline-flex items-center justify-center cursor-help"
      >
        i
      </button>
      <span
        role="tooltip"
        className="hidden group-hover:block group-focus-within:block absolute inset-x-3 top-11 z-10 rounded-md bg-navy-2 text-white text-sm px-3 py-2 shadow-lg"
      >
        {text}
      </span>
    </span>
  );
}

function Kpi({ label, value, sub, warn, info }) {
  return (
    <div className={`relative border rounded-lg px-5 py-4 ${warn ? "bg-sold-soft border-sold" : "bg-white border-line/70"}`}>
      <p className="text-sm text-muted">
        {label}
        {info && <Info text={info} />}
      </p>
      <p className="text-3xl font-bold text-navy-2 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const { stats, hallStats } = await loadAdminData();
  return (
    <>
      <h1 className="font-serif text-gold text-3xl mb-6">Áttekintés</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Jelentkezések" value={stats.registrations} sub={stats.cancelledCount ? `+ ${stats.cancelledCount} lemondva` : null} />
        <Kpi label="Résztvevők" value={`${stats.people} fő`} />
        <Kpi label="Fizetésre vár" value={stats.pendingCount} sub={huf(stats.pendingAmount)} />
        <Kpi label="Fizetve" value={stats.paidCount} sub={huf(stats.paidAmount)} />
        <Kpi
          label="Ma kiküldött email"
          value={stats.emails.today}
          sub={`utolsó 24 óra: ${stats.emails.last24h} / ~500`}
          warn={stats.emails.last24h >= EMAIL_WARN}
          info="24 órán belül legfeljebb kb. 500 emailt tudunk kiküldeni. Ha a szám 400 fölé megy, kérjük, lehetőség szerint várjanak a fizetések visszaigazolásával („✓ Fizetve”), mert minden visszaigazolás emailt küld."
        />
      </div>

      <h2 className="font-serif text-gold text-2xl mt-10 mb-4">Termek</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {hallStats.map((h) => {
          const pct = h.capacity ? Math.round((h.taken / h.capacity) * 100) : 0;
          return (
            <div key={h.id} className="bg-white border border-line/70 rounded-lg px-5 py-4">
              <div className="flex items-baseline justify-between">
                <p className="font-bold">{h.label}</p>
                <p className="text-sm text-muted tabular-nums">
                  {h.taken} / {h.capacity} foglalt · <b className={h.free ? "text-free" : "text-sold"}>{h.free} szabad</b>
                </p>
              </div>
              <div className="h-2.5 bg-line/40 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full ${pct >= 100 ? "bg-sold" : "bg-navy-2"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <CapacityForm hallId={h.id} label={h.label} capacity={h.capacity} taken={h.taken} />
            </div>
          );
        })}
      </div>
    </>
  );
}
