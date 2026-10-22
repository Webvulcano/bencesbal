import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import GuestForm from "@/components/admin/GuestForm";
import { loadAdminData } from "@/lib/admin-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function UjVendeg() {
  await requireAdmin();
  const [{ data: types, error }, { hallStats }] = await Promise.all([
    getSupabaseAdmin().from("ticket_types").select("id, hall_id, label, price, late_price, late_from, is_public, sort").order("sort"),
    loadAdminData(),
  ]);
  if (error) throw new Error(error.message);
  // Show the price admin_create_registration will charge now (late price from late_from on).
  const now = new Date();
  const current = types.map((t) => ({ ...t, price: t.late_from && now >= new Date(t.late_from) ? t.late_price : t.price }));

  return (
    <>
      <Link href="/admin/jelentkezok" className="text-sm text-muted hover:text-navy-2">← Jelentkezők</Link>
      <h1 className="font-serif text-gold text-3xl mt-1 mb-1">Vendég felvétele</h1>
      <p className="text-muted mb-6">Meghívott vendég (díszvendég, támogató, szervező…) közvetlen felvitele, a nyilvános jelentkezés megkerülésével.</p>
      <GuestForm types={current} halls={hallStats} />
    </>
  );
}
