"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function Inner({ children, className }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50 cursor-pointer`}>
      {pending ? "…" : children}
    </button>
  );
}

// confirm: string (body only) or { title, body, label, tone: "danger" | "ok", requireText }
// requireText: the OK button stays disabled until this exact phrase is typed
function ConfirmDialog({ confirm, onCancel, onOk }) {
  const c = typeof confirm === "string" ? { body: confirm } : confirm;
  const okRef = useRef(null);
  const inputRef = useRef(null);
  const [typed, setTyped] = useState("");
  const locked = !!c.requireText && typed.trim() !== c.requireText;
  useEffect(() => {
    (inputRef.current || okRef.current)?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const okClass = c.tone === "danger" ? "bg-sold" : "bg-free";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy/50 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        className="w-full max-w-md bg-white rounded-lg shadow-xl border-t-4 border-gold p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cd-title" className="font-serif text-2xl text-navy">{c.title || "Biztos vagy benne?"}</h2>
        {c.body && <p className="mt-3 text-[15px] text-black/80 whitespace-pre-line">{c.body}</p>}
        {c.requireText && (
          <label className="block mt-4 text-sm">
            <span className="text-muted">
              A megerősítéshez írd be: <b className="text-black select-none">{c.requireText}</b>
            </span>
            <input
              ref={inputRef}
              className="field mt-1.5 w-full"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault(); // dialog lives inside the <form>: stop implicit submit
                if (!locked) onOk();
              }}
              autoComplete="off"
              onPaste={(e) => e.preventDefault()}
            />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-line px-4 py-2 text-sm font-bold text-muted hover:bg-[#f5f5f2] cursor-pointer">
            Mégse
          </button>
          <button ref={okRef} type="button" disabled={locked} onClick={onOk} className={`rounded-md ${okClass} text-white px-4 py-2 text-sm font-bold hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}>
            {c.label || "Igen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActionButton({ action, ref_, confirm, children, className }) {
  const formRef = useRef(null);
  const confirmed = useRef(false);
  const [open, setOpen] = useState(false);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (!confirm || confirmed.current) {
          confirmed.current = false;
          return;
        }
        e.preventDefault();
        setOpen(true);
      }}
    >
      <input type="hidden" name="ref" value={ref_} />
      <Inner className={className}>{children}</Inner>
      {open && (
        <ConfirmDialog
          confirm={confirm}
          onCancel={() => setOpen(false)}
          onOk={() => {
            setOpen(false);
            confirmed.current = true;
            formRef.current.requestSubmit();
          }}
        />
      )}
    </form>
  );
}
