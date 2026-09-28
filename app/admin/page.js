import { loadAdminData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";

function Kpi({ label, value, sub }) {
  return (
    <div className="bg-white border border-line/70 rounded-lg px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-bold text-navy-2 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminHome() {
  const { stats, hallStats } = await loadAdminData();
  return (
    <>
      <h1 className="font-serif text-gold text-3xl mb-6">Áttekintés</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Jelentkezések" value={stats.registrations} sub={stats.cancelledCount ? `+ ${stats.cancelledCount} lemondva` : null} />
        <Kpi label="Résztvevők" value={`${stats.people} fő`} />
        <Kpi label="Fizetésre vár" value={stats.pendingCount} sub={huf(stats.pendingAmount)} />
        <Kpi label="Fizetve" value={stats.paidCount} sub={huf(stats.paidAmount)} />
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
            </div>
          );
        })}
      </div>
    </>
  );
}
