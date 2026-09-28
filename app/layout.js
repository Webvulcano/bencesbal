import { Cormorant_Garamond } from "next/font/google";
import Image from "next/image";
import { EVENT } from "@/lib/constants";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Jelentkezés — Győri Bencés Bál",
  description: "Jelentkezés a Győri Bencés Bálra",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu" className={`${cormorant.variable} h-full antialiased`}>
      <body className="h-dvh overflow-hidden flex flex-col relative">
        <header className="shrink-0 bg-navy border-b-4 border-gold shadow-[0_4px_8px_rgba(0,0,0,0.1)] relative z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
            <a href="https://gyoribencesbal.hu" className="font-serif italic text-gold text-[22px] sm:text-3xl leading-none whitespace-nowrap">
              {EVENT.name}
            </a>
            <span className="font-serif text-gold/90 text-sm sm:text-base text-right leading-tight">{EVENT.date.replace(/ \(.*\)$/, "")}</span>
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
      </body>
    </html>
  );
}
