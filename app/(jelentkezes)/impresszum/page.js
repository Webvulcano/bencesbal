import { LEGAL } from "@/lib/constants";

export const metadata = { title: "Impresszum" };

function Rows({ rows }) {
  return (
    <dl className="divide-y divide-bal-border/70 border-y border-bal-border">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="py-2 grid sm:grid-cols-[11rem_1fr] gap-x-3">
            <dt className="text-muted">{k}</dt>
            <dd className="min-w-0 break-words">{k === "E-mail" ? <a href={`mailto:${v}`} className="text-bal-gold-ink underline">{v}</a> : v}</dd>
          </div>
        ))}
    </dl>
  );
}

export default function Impresszum() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <h1 className="font-display font-bold text-bal-gold-dark text-3xl">Impresszum</h1>
        <Rows rows={LEGAL.publisher} />
        <h2 className="font-display font-bold text-bal-gold-dark text-xl">Tárhelyszolgáltató</h2>
        <Rows rows={LEGAL.hosting} />
        {/* Plain <a>: while registration is closed, / is the static teaser (proxy.js rewrite), not a Next.js page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="btn-ghost inline-block">
          ← Vissza a jelentkezéshez
        </a>
      </div>
    </main>
  );
}
