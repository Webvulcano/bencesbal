"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Áttekintés", icon: "◧" },
  { href: "/admin/jelentkezok", label: "Jelentkezők", icon: "☰" },
  { href: "/admin/export", label: "Excel export", icon: "⤓" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto">
      {ITEMS.map((it) => {
        const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-[15px] transition ${
              active ? "bg-white/10 text-gold font-bold shadow-[inset_3px_0_0_var(--color-gold)]" : "text-white/80 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span aria-hidden className="w-4 text-center">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
