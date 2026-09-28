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

export default function RootLayout({ children }) {
  return (
    <html lang="hu" className={`${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="bg-navy border-b-4 border-gold shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            <a href="https://gyoribencesbal.hu" className="font-serif italic text-gold text-3xl sm:text-[40px] leading-tight">
              {EVENT.name}
            </a>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-16">
          <div className="flex justify-center px-4">
            <Image src="/images/dance.jpg" alt="Táncoló pár" width={300} height={249} className="w-56 sm:w-72 h-auto" />
          </div>
          <div className="border-t border-line/60 mt-4 py-5 text-center">
            <a href="https://jelentkezes.gyoribencesbal.hu/adatkezelesi.pdf" target="_blank" rel="noopener" className="text-navy-2 hover:underline text-[15px]">
              Adatkezelési szabályzat
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
