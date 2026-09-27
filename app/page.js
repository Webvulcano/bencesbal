import JelentkezesFlow from "@/components/JelentkezesFlow";
import { EVENT } from "@/lib/constants";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{EVENT.name} — Jelentkezés</h1>
      <p>{EVENT.date} · {EVENT.venue}</p>
      <JelentkezesFlow />
    </main>
  );
}
