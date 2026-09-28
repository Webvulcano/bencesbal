import Link from "next/link";
import GuestForm from "@/components/admin/GuestForm";
import { loadAdminData } from "@/lib/admin-data";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function UjVendeg() {
  const [{ data: types, error }, { hallStats }] = await Promise.all([
    supabaseAdmin.from("ticket_types").select("id, hall_id, label, price, is_public, sort").order("sort"),
    loadAdminData(),
  ]);
  if (error) throw new Error(error.message);

  return (
    <>
      <Link href="/admin/jelentkezok" className="text-sm text-muted hover:text-navy-2">← Jelentkezők</Link>
      <h1 className="font-serif text-gold text-3xl mt-1 mb-1">Vendég felvétele</h1>
      <p className="text-muted mb-6">Meghívott vendég (díszvendég, támogató, szervező…) közvetlen felvitele, a nyilvános jelentkezés megkerülésével.</p>
      <GuestForm types={types} halls={hallStats} />
    </>
  );
}
