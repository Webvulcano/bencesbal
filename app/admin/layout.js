import AdminNav from "@/components/admin/AdminNav";
import { EVENT } from "@/lib/constants";

export const metadata = { title: "Admin — Győri Bencés Bál" };

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-dvh md:flex bg-[#f7f6f2]">
      <aside className="md:w-60 md:shrink-0 bg-navy md:min-h-dvh md:sticky md:top-0 md:self-start border-b-4 md:border-b-0 md:border-r-4 border-gold px-3 py-3 md:py-6">
        <div className="px-3 mb-3 md:mb-8">
          <p className="font-serif italic text-gold text-xl leading-tight">{EVENT.name}</p>
          <p className="text-white/50 text-xs uppercase tracking-[2px] mt-1">Admin</p>
        </div>
        <AdminNav />
      </aside>
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">{children}</main>
    </div>
  );
}
