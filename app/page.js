import JelentkezesFlow from "@/components/JelentkezesFlow";
import { EVENT } from "@/lib/constants";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="text-center pt-10 sm:pt-14">
        <p className="font-serif font-semibold text-gold uppercase tracking-[2px] sm:tracking-[3px] text-xl sm:text-[28px]">{EVENT.date}</p>
        <p className="text-muted mt-1">{EVENT.venue} · {EVENT.venueAddress}</p>
      </div>
      <h1 className="h-page mt-6 mb-8">Jelentkezés</h1>
      <JelentkezesFlow />
    </main>
  );
}
