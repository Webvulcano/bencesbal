import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const STATUS = {
  pending: { label: "Fizetésre vár", cls: "bg-gold-soft text-navy-2 border-gold" },
  paid: { label: "Fizetve", cls: "bg-free-soft text-free border-free" },
  cancelled: { label: "Lemondva", cls: "bg-sold-soft text-sold border-sold" },
};

export async function loadAdminData() {
  const [regsRes, typesRes, hallsRes] = await Promise.all([
    supabaseAdmin.from("registrations").select("*, tickets(*), friend_links(friend_ref)").order("id"),
    supabaseAdmin.from("ticket_types").select("*"),
    supabaseAdmin.from("halls").select("*").order("id"),
  ]);
  for (const r of [regsRes, typesRes, hallsRes]) if (r.error) throw new Error(r.error.message);

  const halls = Object.fromEntries(hallsRes.data.map((h) => [h.id, h]));
  const types = Object.fromEntries(typesRes.data.map((t) => [t.id, t]));

  const registrations = regsRes.data.map((r) => {
    const members = [...r.tickets]
      .sort((a, b) => a.seq - b.seq)
      .map((t) => ({
        seq: t.seq,
        name: t.holder_name,
        email: t.holder_email ?? "",
        ticketNo: t.ticket_no,
        typeLabel: types[t.ticket_type_id]?.label ?? t.ticket_type_id,
        hallId: t.hall_id,
        hallLabel: halls[t.hall_id]?.label ?? t.hall_id,
        isContact: t.is_contact,
      }));
    return {
      id: r.id,
      ref: r.ref,
      status: r.status,
      source: r.source,
      guestCategory: r.guest_category,
      note: r.note,
      contact: { name: r.contact_name, email: r.contact_email ?? "", phone: r.contact_phone ?? "" },
      address: { zip: r.zip ?? "", city: r.city ?? "", street: r.street ?? "", no: r.house_no ?? "", floor: r.floor ?? "" },
      paperTicket: r.paper_ticket,
      total: r.total,
      createdAt: r.created_at,
      paidAt: r.paid_at,
      printedAt: r.printed_at,
      members,
      hallLabels: [...new Set(members.map((m) => m.hallLabel))],
      friendRefs: r.friend_links.map((l) => l.friend_ref),
      linked: [],
      groupNo: null,
    };
  });

  assignSeatingGroups(registrations);

  const active = registrations.filter((r) => r.status !== "cancelled");
  const hallStats = Object.values(halls).map((h) => {
    const taken = active.reduce((a, r) => a + r.members.filter((m) => m.hallId === h.id).length, 0);
    return { id: h.id, label: h.label, capacity: h.capacity, taken, free: Math.max(h.capacity - taken, 0) };
  });

  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const pending = registrations.filter((r) => r.status === "pending");
  const paid = registrations.filter((r) => r.status === "paid");
  const stats = {
    registrations: active.length,
    people: sum(active, (r) => r.members.length),
    pendingCount: pending.length,
    pendingAmount: sum(pending, (r) => r.total),
    paidCount: paid.length,
    paidAmount: sum(paid, (r) => r.total),
    cancelledCount: registrations.length - active.length,
  };

  return { registrations: sortForSeating(registrations), hallStats, stats };
}

// Registrations linked by friend codes (in either direction) form one seating group.
function assignSeatingGroups(registrations) {
  const active = registrations.filter((r) => r.status !== "cancelled");
  const byRef = Object.fromEntries(active.map((r) => [r.ref, r]));
  const parent = Object.fromEntries(active.map((r) => [r.ref, r.ref]));
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));

  for (const r of active) {
    for (const ref of r.friendRefs) {
      const other = byRef[ref];
      if (!other) continue;
      parent[find(r.ref)] = find(ref);
      r.linked.push(other);
      other.linked.push(r);
    }
  }

  const roots = new Map();
  for (const r of active) {
    const root = find(r.ref);
    if (!roots.has(root)) roots.set(root, roots.size + 1);
    r.groupNo = roots.get(root);
  }
  for (const r of active) r.linked = [...new Set(r.linked)].map((o) => ({ ref: o.ref, name: o.contact.name }));
}

function sortForSeating(registrations) {
  return [...registrations].sort((a, b) => (a.groupNo ?? Infinity) - (b.groupNo ?? Infinity) || a.id - b.id);
}

export const seatingRequestText = (r) => (r.linked.length ? "Együtt: " + r.linked.map((l) => `${l.ref} (${l.name})`).join(", ") : "");
