import AdminNav from "@/components/admin/AdminNav";
import { getAdmin } from "@/lib/admin-auth";
import { EVENT } from "@/lib/constants";
import { logout } from "./belepes/actions";

export const metadata = { title: "Admin — Győri Bencés Bál" };

// UI only: the real checks are requireAdmin() in each page, route handler and action.
export default async function AdminLayout({ children }) {
  const admin = await getAdmin();
  if (!admin) return <main className="min-h-dvh bg-[#f7f6f2] px-4 py-6">{children}</main>;

  return (
    <div className="min-h-dvh md:flex bg-[#f7f6f2]">
      <aside className="md:w-60 md:shrink-0 bg-navy md:min-h-dvh md:sticky md:top-0 md:self-start border-b-4 md:border-b-0 md:border-r-4 border-gold px-3 py-3 md:py-6">
        <div className="px-3 mb-3 md:mb-8">
          <p className="font-serif italic text-gold text-xl leading-tight">{EVENT.name}</p>
          <p className="text-white/50 text-xs uppercase tracking-[2px] mt-1">Admin</p>
        </div>
        <AdminNav />
        <form action={logout} className="px-3 mt-3 md:mt-8">
          <p className="text-white/50 text-xs truncate mb-1">{admin.email}</p>
          <button type="submit" className="text-white/60 hover:text-white text-sm cursor-pointer">
            Kilépés
          </button>
        </form>
      </aside>
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">{children}</main>
    </div>
  );
}
