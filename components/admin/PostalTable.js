"use client";
import { useMemo, useState, useTransition } from "react";
import { setPrinted } from "@/app/admin/actions";

const MATCH = {
  todo: (r) => r.status === "paid" && !r.printedAt,
  printed: (r) => r.status === "paid" && !!r.printedAt,
  pending: (r) => r.status === "pending",
  all: () => true,
};
const printedDate = (s) => new Date(s).toLocaleDateString("hu-HU", { month: "2-digit", day: "2-digit" });

const pdfUrl = (refs) => "/admin/postazas/pdf?" + refs.map((r) => `ref=${encodeURIComponent(r)}`).join("&");

export default function PostalTable({ rows }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todo");
  const [busy, startTransition] = useTransition();
  const [selected, setSelected] = useState(() => new Set());

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        MATCH[status](r) &&
        (!needle || [r.name, r.ref, r.address, r.ticketNos.join(" ")].some((s) => s.toLowerCase().includes(needle))),
    );
  }, [rows, q, status]);

  const selectable = visible.filter((r) => r.status === "paid");
  const markPrinted = (value) =>
    startTransition(async () => {
      await setPrinted(chosen, value);
      setSelected(new Set());
    });
  const chosen = rows.filter((r) => selected.has(r.ref) && r.status === "paid").map((r) => r.ref);
  const allVisibleSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.ref));

  const toggle = (ref) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      selectable.forEach((r) => (allVisibleSelected ? next.delete(r.ref) : next.add(r.ref)));
      return next;
    });

  return (
    <>
      <div className="bg-white border border-line/70 rounded-lg p-3 mb-3 flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-xs font-bold text-muted mb-1">Keresés</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Név, cím, település, GYBB-kód, jegyszám" className="field py-2" />
        </label>
        <label>
          <span className="block text-xs font-bold text-muted mb-1">Státusz</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field py-2">
            <option value="todo">Postázandó (még nem nyomtatott)</option>
            <option value="printed">Nyomtatva</option>
            <option value="pending">Még nem fizetett</option>
            <option value="all">Mind</option>
          </select>
        </label>
      </div>

      <div className="sticky top-0 z-10 bg-navy text-white rounded-lg px-4 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm">
          <b className="text-gold">{chosen.length}</b> kijelölve
          {chosen.length > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} className="ml-3 text-white/70 hover:text-white underline text-xs cursor-pointer">
              kijelölés törlése
            </button>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!chosen.length || busy}
          onClick={() => markPrinted(status !== "printed")}
          className="rounded-md font-bold text-sm px-4 py-2 border border-gold/70 text-gold hover:bg-white/10 disabled:opacity-40 disabled:cursor-default cursor-pointer"
        >
          {busy ? "Mentés…" : status === "printed" ? "↺ Vissza: nem nyomtatott" : "✓ Megjelölés nyomtatottként"}
        </button>
        <a
          href={chosen.length ? pdfUrl(chosen) : undefined}
          target="_blank"
          rel="noopener"
          aria-disabled={!chosen.length}
          className={`rounded-md font-bold text-sm px-4 py-2 ${chosen.length ? "bg-gold text-navy hover:brightness-105" : "bg-white/10 text-white/40 pointer-events-none"}`}
        >
          ⤓ Kijelöltek letöltése PDF-ben
        </a>
        </div>
      </div>

      <div className="bg-white border border-line/70 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted uppercase tracking-wide border-b border-line/60">
            <tr>
              <th className="pl-4 py-2.5 w-8">
                <input
                  type="checkbox"
                  aria-label="Összes látható kijelölése"
                  checked={allVisibleSelected}
                  disabled={!selectable.length}
                  onChange={toggleAll}
                  className="size-4 accent-[var(--color-navy-2)] cursor-pointer"
                />
              </th>
              <th className="px-4 py-2.5 font-semibold">Címzett</th>
              <th className="px-4 py-2.5 font-semibold">Cím</th>
              <th className="px-4 py-2.5 font-semibold">Jegyszámok</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-10">
                  Nincs találat.
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const paid = r.status === "paid";
              const on = selected.has(r.ref);
              return (
                <tr
                  key={r.ref}
                  onClick={() => paid && toggle(r.ref)}
                  className={`border-t border-line/40 ${paid ? "cursor-pointer hover:bg-gold-soft/40" : "text-muted"} ${on ? "bg-gold-soft/70" : ""}`}
                >
                  <td className="pl-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`${r.name} kijelölése`}
                      checked={on}
                      disabled={!paid}
                      onChange={() => toggle(r.ref)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-4 accent-[var(--color-navy-2)] cursor-pointer disabled:cursor-default"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-bold">{r.name}</p>
                    <p className="font-mono text-xs">
                      {r.ref}
                      {r.printedAt && (
                        <span className="ml-2 font-sans font-bold text-[11px] text-free border border-free/50 bg-free-soft rounded-full px-2 py-px">
                          nyomtatva {printedDate(r.printedAt)}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">{r.address}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums">
                    {paid ? r.ticketNos.join(", ") : "—"}
                    <span className="block font-sans text-xs text-muted">{r.count} db</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {paid ? (
                      <a
                        href={pdfUrl([r.ref])}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-md border border-navy-2 text-navy-2 font-bold text-sm px-3.5 py-1.5 hover:bg-gold-soft"
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs border border-gold rounded-full px-2.5 py-0.5 bg-gold-soft text-navy-2 font-bold">még nem fizetett</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
