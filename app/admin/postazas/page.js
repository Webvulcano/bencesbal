import { loadAdminData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const addr = (a) => `${a.zip} ${a.city}, ${a.street} ${a.no}${a.floor ? `, ${a.floor}` : ""}`;

export default async function Postazas() {
  const { registrations } = await loadAdminData();
  const wants = registrations.filter((r) => r.paperTicket && r.status !== "cancelled");
  const ready = wants.filter((r) => r.status === "paid");
  const waiting = wants.filter((r) => r.status === "pending");
  const tickets = ready.reduce((a, r) => a + r.members.length, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <h1 className="font-serif text-gold text-3xl">Postázás</h1>
        {ready.length > 0 && (
          <a href="/admin/postazas/pdf" target="_blank" rel="noopener" className="btn-primary text-base px-6 py-3">
            ⤓ Összes letöltése PDF-ben
          </a>
        )}
      </div>
      <p className="text-muted mb-6 max-w-3xl">
        Címzettenként egy címlap (a név és cím a DL ablakos boríték ablakába esik — harmadolva hajtsd a lap szélén lévő jelek mentén),
        utána a kivágható jegyek, oldalanként 4. Csak a <b className="text-black">fizetett</b>, papírjegyet kért jelentkezések kerülnek bele.
      </p>

      <div className="grid grid-cols-3 gap-3 max-w-xl mb-6">
        {[
          ["Postázandó", ready.length],
          ["Jegy", tickets],
          ["Fizetésre vár", waiting.length],
        ].map(([k, v]) => (
          <div key={k} className="bg-white border border-line/70 rounded-lg px-4 py-3">
            <p className="text-sm text-muted">{k}</p>
            <p className="text-2xl font-bold text-navy-2 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {wants.length === 0 ? (
        <p className="text-muted text-center py-16 bg-white border border-line/70 rounded-lg">Még senki nem kért papírjegyet.</p>
      ) : (
        <div className="bg-white border border-line/70 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted uppercase tracking-wide border-b border-line/60">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Címzett</th>
                <th className="px-4 py-2.5 font-semibold">Cím</th>
                <th className="px-4 py-2.5 font-semibold">Jegyszámok</th>
                <th className="px-4 py-2.5 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {[...ready, ...waiting].map((r) => (
                <tr key={r.ref} className={`border-t border-line/40 ${r.status === "pending" ? "text-muted" : ""}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-bold">{r.contact.name}</p>
                    <p className="font-mono text-xs">{r.ref}</p>
                  </td>
                  <td className="px-4 py-2.5">{addr(r.address)}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums">
                    {r.status === "paid" ? r.members.map((m) => m.ticketNo).join(", ") : "—"}
                    <span className="block font-sans text-xs text-muted">{r.members.length} db</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {r.status === "paid" ? (
                      <a href={`/admin/postazas/pdf?ref=${encodeURIComponent(r.ref)}`} target="_blank" rel="noopener" className="rounded-md border border-navy-2 text-navy-2 font-bold text-sm px-3.5 py-1.5 hover:bg-gold-soft">
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs border border-gold rounded-full px-2.5 py-0.5 bg-gold-soft text-navy-2 font-bold">még nem fizetett</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
