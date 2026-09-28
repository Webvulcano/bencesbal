import PostalTable from "@/components/admin/PostalTable";
import { loadAdminData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const addr = (a) => `${a.zip} ${a.city}, ${a.street} ${a.no}${a.floor ? `, ${a.floor}` : ""}`;

export default async function Postazas() {
  const { registrations } = await loadAdminData();
  const wants = registrations.filter((r) => r.paperTicket && r.status !== "cancelled");
  const ready = wants.filter((r) => r.status === "paid" && !r.printedAt);
  const printed = wants.filter((r) => r.status === "paid" && r.printedAt);
  const waiting = wants.filter((r) => r.status === "pending");
  const tickets = ready.reduce((a, r) => a + r.members.length, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <h1 className="font-serif text-gold text-3xl">Postázás</h1>
      </div>
      <p className="text-muted mb-6 max-w-3xl">
        Címzettenként egy címlap (a név és cím a DL ablakos boríték ablakába esik — harmadolva hajtsd a lap szélén lévő jelek mentén),
        utána a kivágható jegyek, oldalanként 4. Csak a <b className="text-black">fizetett</b>, papírjegyet kért jelentkezések kerülnek bele.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mb-6">
        {[
          ["Postázandó", ready.length],
          ["Jegy", tickets],
          ["Nyomtatva", printed.length],
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
        <PostalTable
          rows={[...ready, ...printed, ...waiting].map((r) => ({
            ref: r.ref,
            status: r.status,
            printedAt: r.printedAt,
            name: r.contact.name,
            address: addr(r.address),
            count: r.members.length,
            ticketNos: r.members.map((m) => String(m.ticketNo ?? "")).filter(Boolean),
          }))}
        />
      )}
    </>
  );
}
