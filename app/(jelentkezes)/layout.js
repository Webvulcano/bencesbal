import Image from "next/image";
import Link from "next/link";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BANK, EVENT, LEGAL } from "@/lib/constants";

// Same fonts as gyoribencesbal.hu; loaded only here so the admin keeps Cormorant/Optima.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export default function JelentkezesLayout({ children }) {
  return (
    <div className={`bal ${playfair.variable} ${inter.variable} h-dvh overflow-hidden flex flex-col relative`}>
      <header className="shrink-0 bg-white border-b border-bal-border shadow-[0_2px_12px_rgba(181,149,47,0.08)] relative z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <a href="https://gyoribencesbal.hu" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image src="/images/bal-ikon.png" alt="" width={1203} height={1445} priority className="h-9 sm:h-11 w-auto shrink-0" />
            <Image src="/images/bal-felirat.png" alt={EVENT.name} width={1024} height={144} priority className="h-6 sm:h-8 w-auto min-w-0" />
          </a>
          <span className="font-display font-bold text-bal-gold-dark text-sm sm:text-lg text-right leading-tight">{EVENT.date.replace(/ \(.*\)$/, "")}</span>
        </div>
      </header>

      <Image
        src="/images/dance.jpg"
        alt=""
        aria-hidden
        width={300}
        height={249}
        className="pointer-events-none select-none absolute right-0 bottom-16 w-48 sm:w-72 opacity-[0.07] mix-blend-multiply"
      />

      <div className="flex-1 min-h-0 flex flex-col relative">{children}</div>
      <footer className="shrink-0 bg-white border-t border-bal-border/60 relative z-10">
        <div className="max-w-5xl mx-auto px-4 py-1.5 flex flex-wrap justify-center gap-x-3 text-xs text-muted">
          <span>© 2026–2027 {BANK.beneficiary}</span>
          <Link href="/impresszum" className="underline hover:text-bal-gold-ink">
            Impresszum
          </Link>
          <a href={LEGAL.privacyUrl} target="_blank" rel="noopener" className="underline hover:text-bal-gold-ink">
            Adatkezelési tájékoztató
          </a>
          <span>
            Készítette:{" "}
            <a href="https://webvulcano.hu" target="_blank" rel="noopener" className="underline hover:text-bal-gold-ink">
              webvulcano.hu
            </a>
          </span>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
