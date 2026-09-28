import ActionButton from "@/components/admin/ActionButton";
import { loadAdminData, STATUS } from "@/lib/admin-data";
import { cancelRegistration, markPaid } from "../actions";

export const dynamic = "force-dynamic";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
const dt = (s) => (s ? new Date(s).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" }) : "");

const STATUS_FILTERS = [
  ["", "Mind"],
  ["pending", "Fizetésre vár"],
  ["paid", "Fizetve"],
  ["cancelled", "Lemondva"],
];

export default async function Jelentkezok({ searchParams }) {
  const { status = "", hall = "", q = "" } = await searchParams;
  const { registrations, hallStats } = await loadAdminData();
  const needle = q.trim().toLowerCase();

  const list = registrations.filter(
    (r) =>
      (!status || r.status === status) &&
      (!hall || r.members.some((m) => m.hallId === hall)) &&
      (!needle ||
        r.ref.toLowerCase().includes(needle) ||
        r.contact.phone.toLowerCase().includes(needle) ||
        r.members.some((m) => m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle))),
  );

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h1 className="font-serif text-gold text-3xl">Jelentkezők</h1>
        <p className="text-sm text-muted">
          {list.length} társaság · {list.reduce((a, r) => a + r.members.length, 0)} fő
        </p>
      </div>

      <form className="bg-white border border-line/70 rounded-lg p-3 mb-5 flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[200px]">
          <span className="filter-label">Keresés</span>
          <input name="q" defaultValue={q} placeholder="Név, email, telefon, GYBB-kód" className="field py-2" />
        </label>
        <label>
          <span className="filter-label">Státusz</span>
          <select name="status" defaultValue={status} className="field py-2">
            {STATUS_FILTERS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="filter-label">Terem</span>
          <select name="hall" defaultValue={hall} className="field py-2">
            <option value="">Mind</option>
            {hallStats.map((h) => (
              <option key={h.id} value={h.id}>{h.label}</option>
            ))}
          </select>
        </label>
        <button className="btn-primary text-sm px-5 py-2.5">Szűrés</button>
      </form>

      {list.length === 0 && <p className="text-muted text-center py-16">Nincs találat.</p>}

      <div className="space-y-3">
        {list.map((r) => (
          <article key={r.ref} className={`bg-white border rounded-lg overflow-hidden ${r.status === "cancelled" ? "border-line/70 opacity-60" : "border-line/70"}`}>
            <header className="flex flex-wrap items-start gap-x-6 gap-y-2 px-4 py-3 border-b border-line/60">
              <div className="min-w-[110px]">
                <p className="font-mono font-bold text-navy-2 tracking-wider">{r.ref}</p>
                {r.groupNo && <p className="text-xs text-muted mt-0.5">Ültetési csoport #{r.groupNo}</p>}
              </div>
              <div className="flex-1 min-w-[200px] leading-snug">
                <p className="font-bold">{r.contact.name}</p>
                <p className="text-sm text-muted break-all">
                  {r.contact.email} · {r.contact.phone}
                </p>
                {r.linked.length > 0 && (
                  <p className="text-sm mt-1">
                    <span className="text-gold font-bold">Együtt:</span> {r.linked.map((l) => `${l.ref} (${l.name})`).join(", ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{huf(r.total)}</p>
                <p className="text-xs text-muted">{r.members.length} fő · {r.hallLabels.join(", ")}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                <span className="text-[11px] text-muted">{r.status === "paid" ? `fizetve ${dt(r.paidAt)}` : `jelentkezett ${dt(r.createdAt)}`}</span>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 font-semibold w-20">Jegyszám</th>
                    <th className="px-4 py-2 font-semibold">Név</th>
                    <th className="px-4 py-2 font-semibold">Email</th>
                    <th className="px-4 py-2 font-semibold">Jegy</th>
                    <th className="px-4 py-2 font-semibold">Terem</th>
                  </tr>
                </thead>
                <tbody>
                  {r.members.map((m) => (
                    <tr key={m.seq} className="border-t border-line/40">
                      <td className="px-4 py-2 font-mono font-bold tabular-nums">{m.ticketNo ?? <span className="text-muted font-normal">—</span>}</td>
                      <td className={`px-4 py-2 ${m.isContact ? "font-bold" : ""}`}>{m.name}</td>
                      <td className="px-4 py-2 text-muted break-all">{m.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{m.typeLabel}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{m.hallLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {r.status !== "cancelled" && (
              <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#fafaf7] border-t border-line/60">
                <p className="text-xs text-muted">
                  {r.address.zip} {r.address.city}, {r.address.street} {r.address.no}
                  {r.address.floor ? `, ${r.address.floor}` : ""}
                  {r.paperTicket && <b className="text-navy-2"> · papírjegyet kér</b>}
                </p>
                <div className="flex gap-2">
                  {r.status === "pending" && (
                    <ActionButton action={markPaid} ref_={r.ref} className="rounded-md bg-free text-white font-bold text-sm px-3.5 py-1.5 hover:brightness-110">
                      ✓ Fizetve
                    </ActionButton>
                  )}
                  <ActionButton
                    action={cancelRegistration}
                    ref_={r.ref}
                    confirm={`Biztosan lemondod: ${r.ref} (${r.contact.name}, ${r.members.length} fő)? A helyek felszabadulnak.`}
                    className="rounded-md border border-sold text-sold font-bold text-sm px-3.5 py-1.5 hover:bg-sold-soft"
                  >
                    Lemondás
                  </ActionButton>
                </div>
              </footer>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
