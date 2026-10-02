"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createGuest } from "@/app/admin/actions";
import { GUEST_CATEGORIES, REF_PREFIX } from "@/lib/constants";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeCode = (v) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits ? `${REF_PREFIX}-${digits}` : "";
};

function Section({ title, children, aside }) {
  return (
    <section className="bg-white border border-line/70 rounded-lg p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="font-serif text-gold text-2xl">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Input({ label, required, error, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="label text-sm">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      <input className="field py-2" aria-invalid={error ? "true" : undefined} {...props} />
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export default function GuestForm({ types, halls }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    guestCategory: "Díszvendég",
    note: "",
    qty: {},
    contact: { name: "", email: "", phone: "" },
    companions: [],
    paperTicket: false,
    address: { zip: "", city: "", street: "", no: "", floor: "" },
    friendCodes: [""],
    markPaid: null,
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setIn = (k, sub, v) => setF((p) => ({ ...p, [k]: { ...p[k], [sub]: v } }));

  const count = Object.values(f.qty).reduce((a, b) => a + b, 0);
  const total = types.reduce((a, t) => a + (f.qty[t.id] || 0) * t.price, 0);
  const seats = types.flatMap((t) => Array(f.qty[t.id] || 0).fill(t));
  const markPaid = f.markPaid ?? (count > 0 && total === 0);

  const setQty = (id, n) =>
    setF((p) => {
      const qty = { ...p.qty, [id]: Math.max(0, n) };
      const c = Object.values(qty).reduce((a, b) => a + b, 0);
      const companions = Array.from({ length: Math.max(0, c - 1) }, (_, i) => p.companions[i] || { name: "", email: "" });
      return { ...p, qty, companions };
    });

  function validate() {
    const e = {};
    if (count < 1) e.qty = "Válassz legalább 1 jegyet.";
    if (!f.contact.name.trim()) e.name = "Kötelező";
    if (f.contact.email && !EMAIL_RE.test(f.contact.email)) e.email = "Hibás email";
    f.companions.forEach((c, i) => {
      if (!c.name.trim()) e[`c${i}n`] = "Név kell";
      if (c.email && !EMAIL_RE.test(c.email)) e[`c${i}e`] = "Hibás email";
    });
    if (f.paperTicket) ["zip", "city", "street", "no"].forEach((k) => !f.address[k].trim() && (e[k] = "Kötelező"));
    f.friendCodes.forEach((c, i) => c && !/^[A-Z]+-\d{4}$/.test(c) && (e[`fc${i}`] = `Formátum: ${REF_PREFIX}-1234`));
    setErrors(e);
    return !Object.keys(e).length;
  }

  function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    startTransition(async () => {
      const res = await createGuest({ ...f, markPaid, friendCodes: f.friendCodes.filter(Boolean) });
      if (res.error) setErrors({ submit: res.error });
      else router.push(`/admin/jelentkezok?q=${encodeURIComponent(res.ref)}`);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid 2xl:grid-cols-2 gap-4 items-start max-w-4xl 2xl:max-w-none">
      <div className="space-y-4">
        <Section title="Vendég">
          <div className="grid sm:grid-cols-[220px_1fr] gap-3">
            <label className="block">
              <span className="label text-sm">Vendég típusa</span>
              <select className="field py-2" value={f.guestCategory} onChange={(e) => set("guestCategory", e.target.value)}>
                {GUEST_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label text-sm">Megjegyzés (belső)</span>
              <input className="field py-2" placeholder="pl. polgármester + kísérő, 1. asztal" value={f.note} onChange={(e) => set("note", e.target.value)} />
            </label>
          </div>
        </Section>

        <Section title="Jegyek" aside={<span className="text-sm text-muted">{count} db · <b className="text-navy-2">{huf(total)}</b></span>}>
          <div className="grid md:grid-cols-2 gap-5">
            {halls.map((h) => (
              <div key={h.id}>
                <p className="font-bold mb-2 flex justify-between">
                  {h.label} <span className="text-xs font-semibold text-muted">{h.free} szabad</span>
                </p>
                <div className="space-y-1.5">
                  {types
                    .filter((t) => t.hall_id === h.id)
                    .map((t) => {
                      const q = f.qty[t.id] || 0;
                      return (
                        <div key={t.id} className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${q ? "border-navy-2 bg-gold-soft" : "border-line"}`}>
                          <span className="flex-1 min-w-0 text-sm leading-tight">
                            <span className="block font-semibold">{t.label}</span>
                            <span className="text-xs text-muted">{t.price ? huf(t.price) : "ingyenes"}{!t.is_public && " · csak admin"}</span>
                          </span>
                          <button type="button" aria-label={`${t.label}: kevesebb`} disabled={!q} onClick={() => setQty(t.id, q - 1)} className="size-7 rounded-full border border-navy-2/40 text-navy-2 disabled:opacity-25 cursor-pointer">−</button>
                          <span className="w-6 text-center font-bold tabular-nums">{q}</span>
                          <button type="button" aria-label={`${t.label}: több`} disabled={count >= 50} onClick={() => setQty(t.id, q + 1)} className="size-7 rounded-full bg-navy-2 text-white disabled:opacity-25 cursor-pointer">+</button>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          {errors.qty && <span className="err mt-2">{errors.qty}</span>}
        </Section>

        <Section title="Kapcsolattartó">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Név" required error={errors.name} value={f.contact.name} onChange={(e) => setIn("contact", "name", e.target.value)} />
            <Input label="Email" type="email" error={errors.email} value={f.contact.email} onChange={(e) => setIn("contact", "email", e.target.value)} />
            <Input label="Telefon" type="tel" value={f.contact.phone} onChange={(e) => setIn("contact", "phone", e.target.value)} />
          </div>
          <p className="text-xs text-muted mt-2">Az email nem kötelező — ha üres, a vendég nem kap automatikus levelet.</p>
        </Section>
      </div>

      <div className="space-y-4">
        {f.companions.length > 0 && (
          <Section title="Résztvevők">
            <div className="space-y-3">
              {f.companions.map((c, i) => (
                <div key={i} className="grid grid-cols-[28px_1fr] sm:grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-1 items-start">
                  <span className="font-serif text-gold text-xl row-span-2 pt-5">{i + 2}.</span>
                  <span className="sm:col-span-2 text-[11px] font-bold text-white bg-navy-2 rounded px-2 py-0.5 justify-self-start">{seats[i + 1]?.label}</span>
                  <Input
                    label="Név"
                    required
                    error={errors[`c${i}n`]}
                    value={c.name}
                    onChange={(e) => set("companions", f.companions.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <Input
                    label="Email"
                    type="email"
                    error={errors[`c${i}e`]}
                    value={c.email}
                    onChange={(e) => set("companions", f.companions.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                  />
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Cím">
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <Input label="Irsz." required={f.paperTicket} error={errors.zip} inputMode="numeric" maxLength={4} value={f.address.zip} onChange={(e) => setIn("address", "zip", e.target.value)} />
            <Input label="Település" required={f.paperTicket} error={errors.city} value={f.address.city} onChange={(e) => setIn("address", "city", e.target.value)} />
          </div>
          <div className="grid grid-cols-[1fr_100px_120px] gap-3 mt-3">
            <Input label="Utca, tér" required={f.paperTicket} error={errors.street} value={f.address.street} onChange={(e) => setIn("address", "street", e.target.value)} />
            <Input label="Házszám" required={f.paperTicket} error={errors.no} value={f.address.no} onChange={(e) => setIn("address", "no", e.target.value)} />
            <Input label="Emelet, ajtó" value={f.address.floor} onChange={(e) => setIn("address", "floor", e.target.value)} />
          </div>
        </Section>

        <Section title="Ültetés">
          <p className="text-sm text-muted mb-2">Barátkód(ok): kivel szeretne egy asztalhoz ülni.</p>
          <div className="space-y-2">
            {f.friendCodes.map((code, i) => (
              <div key={i}>
                <div className="flex items-stretch gap-2">
                  <span className="grid place-items-center px-3 rounded-[2px] bg-[#f1f1f1] border border-line text-muted font-mono font-bold tracking-[2px]">{REF_PREFIX}-</span>
                  <input
                    className="field py-2 font-mono font-bold tracking-[3px] w-[110px]"
                    placeholder="1234"
                    inputMode="numeric"
                    aria-label={`${i + 1}. barátkód`}
                    aria-invalid={errors[`fc${i}`] ? "true" : undefined}
                    value={code.slice(REF_PREFIX.length + 1)}
                    onChange={(e) => set("friendCodes", f.friendCodes.map((x, j) => (j === i ? normalizeCode(e.target.value) : x)))}
                  />
                  {f.friendCodes.length > 1 && (
                    <button type="button" aria-label="Törlés" onClick={() => set("friendCodes", f.friendCodes.filter((_, j) => j !== i))} className="px-2 text-muted text-xl hover:text-sold cursor-pointer">×</button>
                  )}
                </div>
                {errors[`fc${i}`] && <span className="err">{errors[`fc${i}`]}</span>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set("friendCodes", [...f.friendCodes, ""])} className="mt-2 text-navy-2 font-bold text-sm hover:underline cursor-pointer">
            + Újabb barátkód
          </button>
        </Section>

        <section className="bg-navy text-white rounded-lg p-5 sticky bottom-4 shadow-lg">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="cb mt-0.5" checked={markPaid} onChange={(e) => set("markPaid", e.target.checked)} />
            <span>
              <b>Rögtön fizetettnek jelölés</b>
              <span className="block text-sm text-white/70">A jegyek azonnal jegyszámot kapnak. Tiszteletjegynél alapból bekapcsolva.</span>
            </span>
          </label>
          {errors.submit && <p role="alert" className="mt-3 rounded-md bg-sold-soft text-sold font-semibold text-sm px-3 py-2">{errors.submit}</p>}
          {Object.keys(errors).some((k) => k !== "submit") && <p className="mt-3 text-sm text-gold">Javítsd a pirossal jelölt mezőket.</p>}
          <div className="flex items-center justify-between gap-3 mt-4">
            <Link href="/admin/jelentkezok" className="text-white/70 hover:text-white text-sm">Mégse</Link>
            <button type="submit" disabled={pending} className="rounded-lg bg-gold text-navy font-bold uppercase tracking-[1px] px-6 py-3 hover:brightness-105 disabled:opacity-50 cursor-pointer">
              {pending ? "Mentés…" : `Vendég mentése · ${huf(total)}`}
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
