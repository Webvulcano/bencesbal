"use client";
import { useFormStatus } from "react-dom";

function Inner({ children, className }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50 cursor-pointer`}>
      {pending ? "…" : children}
    </button>
  );
}

export default function ActionButton({ action, ref_, confirm, children, className }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="ref" value={ref_} />
      <Inner className={className}>{children}</Inner>
    </form>
  );
}
