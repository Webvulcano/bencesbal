"use client";
import { useCallback, useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { supabase } from "@/lib/supabase";
import { submitRegistration } from "@/app/(jelentkezes)/actions";
import { cleanHouseNo, cleanPhone, cleanZip, isValidPhone, ZIP_RE } from "@/lib/input-filters";
import { bankRows, HALLS, isLatePrice, LATE_PRICE_LABEL, LEGAL, memo, priceOf, REF_PREFIX, RELATIONS, SCHOOLS, TICKET_TYPES } from "@/lib/constants";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => String(2026 - i));
const PUBLIC_TYPES = TICKET_TYPES.filter((t) => !t.adminOnly);
const REQUIRES_LABEL = { oregdiak: "csak öregdiákoknak", munkatars: "csak munkatársaknak" };
const CODE_RE = new RegExp(`^${REF_PREFIX}-\\d{4}$`);
const normalizeCode = (v) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits ? `${REF_PREFIX}-${digits}` : "";
};

const STEP_TITLES = {
  jegy: "Jegytípus",
  letszam: "Ültetés",
  kapcsolat: "Kapcsolattartó",
  lakcim: "Lakcím",
  bences: "Bencés kapcsolat",
  tarsak: "További résztvevők",
  veglegesites: "Véglegesítés",
  fizetes: "Fizetés",
};

const ADDRESS_REQUIRED = {
  zip: "Kérjük, adja meg az irányítószámot",
  city: "Kérjük, adja meg a települést",
  street: "Kérjük, adja meg az utcát",
  no: "Kérjük, adja meg a házszámot",
};

const EMPTY = {
  qty: {},
  friendCodes: [""],
  seatingNote: "",
  contact: { name: "", email: "", phone: "" },
  address: { zip: "", city: "", street: "", no: "", floor: "" },
  relation: { type: "", school: "", year: "", empCode: "" },
  companions: [],
  contactType: "",
  paperTicket: true,
  consent: false,
};

// Capacity lives only in the DB (admin can raise it), so the "/ N" label comes from here too.
async function fetchSeats() {
  const { data, error } = await supabase.rpc("free_seats");
  if (error) return null;
  return {
    free: Object.fromEntries(data.map((h) => [h.hall_id, h.free])),
    capacity: Object.fromEntries(data.map((h) => [h.hall_id, h.capacity])),
  };
}

function Field({ label, hint, error, required, children }) {
  return (
    <div className="mb-3.5">
      <label className="label">
        {label}
        {required && <span className="text-bal-gold-dark"> *</span>}
      </label>
      {hint && <span className="hint">{hint}</span>}
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

function Check({ type = "checkbox", checked, onChange, name, children }) {
  return (
    <label className="check">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span className="box">{checked && (type === "radio" ? <span className="size-2.5 rounded-full bg-bal-gold-dark" /> : "✔")}</span>
      <span>{children}</span>
    </label>
  );
}

function TicketCard({ t, qty, max, soldOut, onQty }) {
  const presale = t.latePrice != null && !isLatePrice();
  const latePrice = presale && `${LATE_PRICE_LABEL} ${huf(t.latePrice)}`;
  const meta = [soldOut && "ELFOGYOTT", presale && t.note, latePrice, t.requires && REQUIRES_LABEL[t.requires], t.maxPeople && `max. ${t.maxPeople} fő`].filter(Boolean);
  const active = qty > 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border-2 pl-3.5 pr-2 py-2 transition ${
        soldOut ? "border-bal-border bg-[#fafafa] text-muted" : active ? "border-bal-gold bg-bal-subtle shadow-[inset_5px_0_0_var(--color-bal-gold)]" : "border-bal-border bg-white"
      }`}
    >
      <span className="flex-1 min-w-0 leading-tight">
        <span className="block font-bold">{t.label}</span>
        <span className="block text-[13px] mt-0.5">
          <b className={soldOut ? "" : "text-bal-gold-ink"}>{huf(priceOf(t))}</b> <span className="text-muted">/ fő</span>
          {meta.map((m) => (
            <span key={m} className={`font-semibold ${m === "ELFOGYOTT" ? "text-sold" : "text-muted"}`}>
              {" · "}
              {m === latePrice ? <span className="whitespace-nowrap">{m}</span> : m}
            </span>
          ))}
        </span>
      </span>
      <div className="flex items-center shrink-0">
        <button
          type="button"
          aria-label={`${t.label}: kevesebb`}
          disabled={soldOut || qty <= 0}
          onClick={() => onQty(qty - 1)}
          className="size-9 rounded-full border border-bal-border bg-bal-subtle text-bal-gold-ink text-xl leading-none grid place-items-center cursor-pointer hover:border-bal-gold disabled:opacity-25 disabled:cursor-default"
        >
          −
        </button>
        <span className={`w-8 text-center font-bold text-lg tabular-nums ${active ? "text-bal-gold-ink" : "text-muted"}`} aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          aria-label={`${t.label}: több`}
          disabled={soldOut || qty >= max}
          onClick={() => onQty(qty + 1)}
          className="size-9 rounded-full bg-bal-gold-dark text-white text-xl leading-none grid place-items-center cursor-pointer hover:bg-bal-gold-ink disabled:opacity-25 disabled:cursor-default"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TicketTag({ t }) {
  if (!t) return null;
  const tier = t.id.endsWith("_arany") ? "bg-bal-gold text-bal-ink" : t.id.endsWith("_ezust") ? "bg-[#e8e8ec] text-bal-ink" : "bg-bal-gold-dark text-white";
  return <span className={`inline-block text-[12px] font-bold rounded px-2 py-0.5 whitespace-nowrap ${tier}`}>{t.label}</span>;
}

export default function JelentkezesFlow() {
  const [stepIdx, setStepIdx] = useState(0);
  const [hall, setHall] = useState("disz");
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [free, setFree] = useState(null);
  const [capacity, setCapacity] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const applySeats = useCallback((s) => {
    if (!s) return;
    setFree(s.free);
    setCapacity(s.capacity);
  }, []);
  const loadFree = useCallback(() => fetchSeats().then(applySeats), [applySeats]);

  useEffect(() => {
    let alive = true;
    fetchSeats().then((s) => alive && applySeats(s));
    return () => {
      alive = false;
    };
  }, [applySeats]);

  const count = Object.values(f.qty).reduce((a, b) => a + b, 0);
  const total = PUBLIC_TYPES.reduce((sum, t) => sum + (f.qty[t.id] || 0) * priceOf(t), 0);
  // The contact picks which of the chosen types is theirs; their type goes first (same order as create_registration).
  const picked = PUBLIC_TYPES.filter((t) => f.qty[t.id]);
  const contactType = picked.some((t) => t.id === f.contactType) ? f.contactType : picked[0]?.id;
  const seats = [...picked].sort((a, b) => (b.id === contactType) - (a.id === contactType)).flatMap((t) => Array(f.qty[t.id]).fill(t));
  const lines = PUBLIC_TYPES.filter((t) => f.qty[t.id]).map((t) => `${f.qty[t.id]} × ${t.label}`);

  const steps = ["jegy", "letszam", "kapcsolat", "lakcim", "bences", ...(count > 1 ? ["tarsak"] : []), "veglegesites", "fizetes"];
  const step = steps[stepIdx];
  const formSteps = steps.length - 1;

  const set = (path, value) =>
    setF((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let o = next;
      keys.slice(0, -1).forEach((k) => (o = o[k]));
      o[keys.at(-1)] = value;
      return next;
    });

  const setQty = (id, n) =>
    setF((prev) => {
      const qty = { ...prev.qty, [id]: Math.max(0, n) };
      const c = Object.values(qty).reduce((a, b) => a + b, 0);
      const companions = Array.from({ length: Math.max(0, c - 1) }, (_, i) => prev.companions[i] || { name: "", email: "" });
      return { ...prev, qty, companions };
    });

  function validate() {
    const e = {};
    if (step === "jegy" && count < 1) e.ticket = "Kérjük, válasszon legalább egy jegyet";
    if (step === "letszam") {
      f.friendCodes.forEach((c, i) => {
        if (c && !CODE_RE.test(c)) e[`fc${i}`] = `Kérjük, a barátkódot ${REF_PREFIX}-1234 formában adja meg`;
      });
    }
    if (step === "kapcsolat") {
      if (!f.contact.name.trim()) e.name = "Kérjük, adja meg a nevét";
      if (!EMAIL_RE.test(f.contact.email)) e.email = "Kérjük, adjon meg egy érvényes e-mail-címet";
      if (!f.contact.phone.trim()) e.phone = "Kérjük, adja meg a telefonszámát";
      else if (!isValidPhone(f.contact.phone)) e.phone = "Kérjük, adjon meg egy érvényes telefonszámot, pl. +36 30 123 4567";
    }
    if (step === "lakcim") {
      Object.entries(ADDRESS_REQUIRED).forEach(([k, msg]) => !f.address[k].trim() && (e[k] = msg));
      if (f.address.zip && !ZIP_RE.test(f.address.zip)) e.zip = "Kérjük, adjon meg egy érvényes, négyjegyű irányítószámot";
    }
    if (step === "bences") {
      if (!f.relation.type) e.relation = "Kérjük, válassza ki, hogyan kapcsolódik közösségünkhöz";
      if (f.relation.type === "oregdiak" && (!f.relation.school || !f.relation.year)) e.relation = "Kérjük, adja meg az iskolát és az érettségi évét";
      if (f.relation.type === "munkatars" && !f.relation.empCode.trim()) e.relation = "Kérjük, adja meg a dolgozói kódot";
    }
    if (step === "tarsak")
      f.companions.forEach((c, i) => {
        if (!c.name.trim()) e[`c${i}n`] = "Kérjük, adja meg a résztvevő nevét";
        if (!EMAIL_RE.test(c.email)) e[`c${i}e`] = "Kérjük, adjon meg egy érvényes e-mail-címet";
      });
    if (step === "veglegesites" && !f.consent) e.consent = "A jelentkezéshez kérjük, fogadja el az adatkezelési szabályzatot";
    setErrors(e);
    return !Object.keys(e).length;
  }

  const bad = (k) => (errors[k] ? "true" : undefined);

  async function submit() {
    setSubmitting(true);
    let res;
    try {
      res = await submitRegistration({
        qty: f.qty,
        contact: f.contact,
        address: f.address,
        relation: f.relation,
        companions: f.companions,
        contactType,
        friendCodes: f.friendCodes.filter(Boolean),
        seatingNote: f.seatingNote.trim(),
        paperTicket: f.paperTicket,
        consent: f.consent,
      });
    } catch {
      res = { error: "NETWORK" };
    }
    setSubmitting(false);
    if (res.error) {
      const msg = res.error;
      if (msg.startsWith("SOLD_OUT:")) {
        const h = HALLS[msg.split(":")[1]];
        setErrors({ submit: `Sajnáljuk, időközben elfogytak a szabad helyek${h ? ` a(z) ${h.label}ben` : ""}. Kérjük, módosítsa a jegyek számát vagy típusát.` });
        loadFree();
      } else if (msg.startsWith("BAD_FRIEND_CODE:")) {
        setErrors({ submit: `A(z) ${msg.split(":")[1]} barátkódot nem találjuk. Kérjük, ellenőrizze, vagy törölje az Ültetés lépésnél.` });
      } else if (msg === "REGISTRATION_CLOSED") {
        setErrors({ submit: "A jelentkezés jelenleg nem érhető el. Köszönjük megértését!" });
      } else {
        setErrors({ submit: "Sajnáljuk, a jelentkezést most nem sikerült elküldeni. Kérjük, próbálja újra néhány perc múlva." });
      }
      return;
    }
    setRef(res.ref);
    track("Jelentkezés elküldve");
    loadFree();
    setStepIdx(stepIdx + 1);
  }

  function next() {
    if (!validate()) return;
    if (step === "veglegesites") return submit();
    setStepIdx(stepIdx + 1);
  }

  function back() {
    setErrors({});
    setStepIdx(stepIdx - 1);
  }

  function restart() {
    setF(EMPTY);
    setErrors({});
    setRef("");
    setCopied("");
    setHelpOpen(false);
    setStepIdx(0);
  }

  async function copy(what, text) {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {step !== "fizetes" && (
        <div className="shrink-0 max-w-xl w-full mx-auto px-4 pt-4 sm:pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display font-bold text-bal-gold-dark text-[26px] sm:text-3xl leading-none">{STEP_TITLES[step]}</h1>
            <span className="text-sm text-muted whitespace-nowrap">
              {stepIdx + 1} / {formSteps}
            </span>
          </div>
          <div className="h-[3px] bg-bal-border/60 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-bal-gold transition-all duration-300" style={{ width: `${((stepIdx + 1) / formSteps) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-xl w-full mx-auto px-4 py-4 sm:py-6">
          {step === "jegy" && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3" role="tablist">
                {Object.values(HALLS).map((h) => {
                  const hallFree = free?.[h.id];
                  const active = hall === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setHall(h.id)}
                      className={`rounded-xl border-2 px-3 py-2 text-left transition cursor-pointer ${active ? "border-bal-gold-dark bg-bal-gold-dark text-white shadow-[0_6px_20px_rgba(181,149,47,0.2)]" : "border-bal-border bg-white hover:border-bal-gold"}`}
                    >
                      <span className="flex items-center justify-between gap-2 font-bold">
                        {h.label}
                        {(() => {
                          const n = PUBLIC_TYPES.filter((t) => t.hall === h.id).reduce((a, t) => a + (f.qty[t.id] || 0), 0);
                          return n > 0 ? <span className={`text-[12px] rounded-full px-2 py-0.5 ${active ? "bg-white text-bal-gold-ink" : "bg-bal-subtle text-bal-gold-ink"}`}>{n} db</span> : null;
                        })()}
                      </span>
                      <span className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${active ? "text-white/85" : "text-muted"}`}>
                        <span className={`size-2 rounded-full ${hallFree == null ? "bg-line" : hallFree > 0 ? "bg-free" : "bg-sold"}`} />
                        {hallFree == null ? "…" : hallFree > 0 ? `${hallFree} szabad / ${capacity[h.id]}` : "Betelt"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {PUBLIC_TYPES.filter((t) => t.hall === hall).map((t) => {
                  const q = f.qty[t.id] || 0;
                  const hallFree = free?.[t.hall] ?? 0;
                  const hallTaken = PUBLIC_TYPES.filter((x) => x.hall === t.hall).reduce((a, x) => a + (f.qty[x.id] || 0), 0);
                  return (
                    <TicketCard
                      key={t.id}
                      t={t}
                      qty={q}
                      max={Math.min(20 - (count - q), t.maxPeople ?? 20, hallFree - (hallTaken - q))}
                      soldOut={free !== null && hallFree === 0}
                      onQty={(n) => {
                        setQty(t.id, n);
                        setErrors({});
                      }}
                    />
                  );
                })}
              </div>
              <span className="block text-[12.8px] font-semibold text-muted mt-2.5">Egy jelentkezésben összesen max. 20 jegy. Több jegytípus is választható.</span>
              {errors.ticket && <span className="err mt-1">{errors.ticket}</span>}
            </>
          )}

          {step === "letszam" && (
            <>
              <p className="text-muted mb-5">Szeretne barátaival egy asztalhoz ülni? Ha kapott tőlük barátkódot, kérjük, írja be ide.</p>
              <div className="relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <label htmlFor="friendCode0" className="font-bold">
                    Barátkód <span className="font-normal text-muted text-sm">(nem kötelező)</span>
                  </label>
                  <button
                    type="button"
                    aria-label="Mi az a barátkód?"
                    aria-expanded={helpOpen}
                    onClick={() => setHelpOpen(!helpOpen)}
                    className={`size-5 rounded-full border text-[12px] font-bold grid place-items-center cursor-pointer transition ${helpOpen ? "bg-bal-gold-dark border-bal-gold-dark text-white" : "border-bal-gold-dark text-bal-gold-dark hover:bg-bal-subtle"}`}
                  >
                    ?
                  </button>
                </div>
                {helpOpen && (
                  <div role="tooltip" className="absolute z-20 left-0 right-0 top-8 bg-white text-bal-ink text-[14px] leading-snug rounded-xl p-3.5 shadow-[0_10px_30px_rgba(181,149,47,0.18)] border border-bal-border border-l-4 border-l-bal-gold">
                    <p className="font-display font-bold text-bal-gold-dark mb-1">Mi az a barátkód?</p>
                    <p>
                      A fizetés végén <b>mindenki kap egy barátkódot</b> (pl. {REF_PREFIX}-1234).
                    </p>
                    <p className="mt-1.5">
                      Ezzel jelezheti, hogy kikkel szeretne <b>egy asztalhoz ülni</b>, akkor is, ha külön jelentkeznek. Ha egy barátja már jelentkezett, kérje el a kódját, és írja be ide.
                    </p>
                    <button type="button" onClick={() => setHelpOpen(false)} className="mt-2 text-bal-gold-ink font-bold text-sm cursor-pointer hover:underline">
                      Értem
                    </button>
                  </div>
                )}
                <div className="space-y-2 max-h-[calc(100dvh-430px)] min-h-[52px] overflow-y-auto overscroll-contain">
                  {f.friendCodes.map((code, i) => (
                    <div key={i}>
                      <div className="flex items-stretch gap-2">
                        <span aria-hidden className="grid place-items-center px-3 rounded-lg bg-bal-subtle border border-bal-border text-muted font-mono font-bold tracking-[2px] select-none">
                          {REF_PREFIX}-
                        </span>
                        <input
                          id={`friendCode${i}`}
                          className="field font-mono font-bold tracking-[4px] w-[110px]"
                          placeholder="1234"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={`${i + 1}. barátkód, ${REF_PREFIX}- utáni 4 számjegy`}
                          aria-invalid={bad(`fc${i}`)}
                          value={code.slice(REF_PREFIX.length + 1)}
                          onChange={(e) => set(`friendCodes.${i}`, normalizeCode(e.target.value))}
                        />
                        {f.friendCodes.length > 1 && (
                          <button
                            type="button"
                            aria-label={`${i + 1}. barátkód törlése`}
                            onClick={() => set("friendCodes", f.friendCodes.filter((_, j) => j !== i))}
                            className="px-2 text-muted text-xl hover:text-sold cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {errors[`fc${i}`] && <span className="err">{errors[`fc${i}`]}</span>}
                    </div>
                  ))}
                </div>
                {f.friendCodes.length < 10 && (
                  <button
                    type="button"
                    onClick={() => set("friendCodes", [...f.friendCodes, ""])}
                    className="mt-2.5 text-bal-gold-ink font-bold text-[15px] hover:underline cursor-pointer"
                  >
                    + Újabb barátkód
                  </button>
                )}
                <span className="block text-[12.8px] font-semibold text-muted mt-1.5">Barátai kódja alapján egy asztalhoz ültetjük Önöket.</span>
              </div>
              <div className="mt-5">
                <label htmlFor="seatingNote" className="font-bold">
                  Megjegyzés az ültetéshez <span className="font-normal text-muted text-sm">(nem kötelező)</span>
                </label>
                <textarea
                  id="seatingNote"
                  className="field mt-1.5 min-h-24 resize-y"
                  maxLength={500}
                  placeholder="pl. a Kovács családdal szeretnénk egy asztalhoz ülni"
                  value={f.seatingNote}
                  onChange={(e) => set("seatingNote", e.target.value)}
                />
              </div>
            </>
          )}

          {step === "kapcsolat" && (
            <>
              <Field label="Név" required error={errors.name}>
                <input className="field" autoComplete="name" aria-invalid={bad("name")} value={f.contact.name} onChange={(e) => set("contact.name", e.target.value)} />
              </Field>
              <Field label="E-mail" required hint="erre a címre küldjük a visszaigazolást és a fizetési tudnivalókat" error={errors.email}>
                <input className="field" type="email" autoComplete="email" aria-invalid={bad("email")} value={f.contact.email} onChange={(e) => set("contact.email", e.target.value)} />
              </Field>
              <Field label="Telefon" required error={errors.phone}>
                <input className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="+36 30 123 4567" aria-invalid={bad("phone")} value={f.contact.phone} onChange={(e) => set("contact.phone", cleanPhone(e.target.value))} />
              </Field>
            </>
          )}

          {step === "lakcim" && (
            <>
              <div className="grid grid-cols-[96px_1fr] gap-x-3">
                <Field label="Irsz." required error={errors.zip}>
                  <input className="field" inputMode="numeric" maxLength={4} autoComplete="postal-code" aria-invalid={bad("zip")} value={f.address.zip} onChange={(e) => set("address.zip", cleanZip(e.target.value))} />
                </Field>
                <Field label="Település" required error={errors.city}>
                  <input className="field" autoComplete="address-level2" aria-invalid={bad("city")} value={f.address.city} onChange={(e) => set("address.city", e.target.value)} />
                </Field>
              </div>
              <Field label="Utca, tér" required error={errors.street}>
                <input className="field" aria-invalid={bad("street")} value={f.address.street} onChange={(e) => set("address.street", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-x-3">
                <Field label="Házszám" required error={errors.no}>
                  <input className="field" placeholder="pl. 12/A" aria-invalid={bad("no")} value={f.address.no} onChange={(e) => set("address.no", cleanHouseNo(e.target.value))} />
                </Field>
                <Field label="Emelet, ajtó">
                  <input className="field" value={f.address.floor} onChange={(e) => set("address.floor", e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {step === "bences" && (
            <>
              <p className="label mb-3">
                Hogyan kapcsolódik bencés közösségünkhöz?<span className="text-bal-gold-dark"> *</span>
              </p>
              <div className="space-y-2.5">
                {RELATIONS.map((r) => (
                  <Check key={r.id} type="radio" name="rel" checked={f.relation.type === r.id} onChange={() => set("relation.type", r.id)}>
                    {r.label}
                  </Check>
                ))}
              </div>
              {f.relation.type === "oregdiak" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <select className="field" value={f.relation.school} onChange={(e) => set("relation.school", e.target.value)}>
                    <option value="">Hol érettségizett?</option>
                    {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className="field" value={f.relation.year} onChange={(e) => set("relation.year", e.target.value)}>
                    <option value="">Érettségi éve</option>
                    {YEARS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              )}
              {f.relation.type === "munkatars" && (
                <div className="mt-4">
                  <input className="field" placeholder="Dolgozói kód" value={f.relation.empCode} onChange={(e) => set("relation.empCode", e.target.value)} />
                </div>
              )}
              {errors.relation && <span className="err mt-2">{errors.relation}</span>}
            </>
          )}

          {step === "tarsak" && (
            <>
              <p className="text-muted text-sm mb-3">Kérjük, adja meg, kinek szól a többi jegy — a jegyet e-mailben küldjük el nekik.{picked.length > 1 && " Az 1. sorban kiválaszthatja, melyik jegytípus az Öné."}</p>
              <div className="border-2 border-bal-border bg-white rounded-xl divide-y divide-bal-border/70">
                <div className="flex gap-2.5 items-start px-3 py-2.5">
                  <span className="font-display font-bold text-bal-gold-dark text-xl w-6 pt-1.5 shrink-0">1.</span>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {picked.length > 1 ? (
                        <select
                          className="field w-auto max-w-full py-1 text-[13px] font-bold"
                          aria-label="Kapcsolattartó jegytípusa"
                          value={contactType}
                          onChange={(e) => set("contactType", e.target.value)}
                        >
                          {picked.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <TicketTag t={seats[0]} />
                      )}
                      <span className="text-[12px] text-muted">kapcsolattartó</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input className="field disabled:bg-[#f4f4f4] disabled:text-muted disabled:cursor-not-allowed" aria-label="Kapcsolattartó neve" value={f.contact.name} disabled />
                      <input className="field disabled:bg-[#f4f4f4] disabled:text-muted disabled:cursor-not-allowed" aria-label="Kapcsolattartó e-mail-címe" value={f.contact.email} disabled />
                    </div>
                  </div>
                </div>
                {f.companions.map((c, i) => (
                  <div key={i} className="flex gap-2.5 items-start px-3 py-2.5">
                    <span className="font-display font-bold text-bal-gold-dark text-xl w-6 pt-1.5 shrink-0">{i + 2}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5">
                        <TicketTag t={seats[i + 1]} />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <input className="field" placeholder="Név" aria-invalid={bad(`c${i}n`)} value={c.name} onChange={(e) => set(`companions.${i}.name`, e.target.value)} />
                          {errors[`c${i}n`] && <span className="err">{errors[`c${i}n`]}</span>}
                        </div>
                        <div>
                          <input className="field" type="email" placeholder="E-mail" aria-invalid={bad(`c${i}e`)} value={c.email} onChange={(e) => set(`companions.${i}.email`, e.target.value)} />
                          {errors[`c${i}e`] && <span className="err">{errors[`c${i}e`]}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === "veglegesites" && (
            <>
              <dl className="text-[15px] divide-y divide-bal-border/70 border-y border-bal-border mb-5 max-h-[calc(100dvh-400px)] overflow-y-auto overscroll-contain pr-1">
                {[
                  ["Jegy", lines.join("\n")],
                  ["Kapcsolattartó", `${f.contact.name}\n${f.contact.email}\n${f.contact.phone}`],
                  ["Cím", `${f.address.zip} ${f.address.city}, ${f.address.street} ${f.address.no}${f.address.floor ? ", " + f.address.floor : ""}`],
                  ...(f.friendCodes.some(Boolean) ? [["Barátkód", f.friendCodes.filter(Boolean).join(", ")]] : []),
                  ...(f.seatingNote.trim() ? [["Ültetés", f.seatingNote.trim()]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold break-words whitespace-pre-line">{v}</dd>
                  </div>
                ))}
                {count > 0 && (
                  <div className="grid grid-cols-[110px_1fr] gap-3 py-2">
                    <dt className="text-muted">Résztvevők</dt>
                    <dd className="space-y-1.5">
                      {[f.contact, ...f.companions].map((c, i) => (
                        <div key={i} className="leading-tight">
                          <span className="block font-semibold break-words">
                            {c.name}
                            {i === 0 && <span className="font-normal text-muted text-[13px]"> (kapcsolattartó)</span>}
                          </span>
                          <span className="block text-[13px] text-muted break-words">
                            {c.email} · {seats[i]?.label}
                          </span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="space-y-3.5">
                <div>
                  <Check checked={f.consent} onChange={(e) => set("consent", e.target.checked)}>
                    Az{" "}
                    <a href={LEGAL.privacyUrl} target="_blank" rel="noopener" className="text-bal-gold-ink underline">
                      adatkezelési szabályzatban
                    </a>{" "}
                    foglaltakat elolvastam, megértettem és elfogadom.<span className="text-bal-gold-dark"> *</span>
                  </Check>
                  {errors.consent && <span className="err ml-8">{errors.consent}</span>}
                  {errors.submit && (
                    <p role="alert" className="mt-3 rounded-md border border-sold bg-sold-soft px-3 py-2 text-[14px] text-sold font-semibold">
                      {errors.submit}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === "fizetes" && (
            <>
              <div className="text-center mb-3">
                <h1 className="font-display font-bold text-bal-gold-dark text-2xl sm:text-3xl leading-tight">Köszönjük jelentkezését, {f.contact.name}!</h1>
                <p className="text-muted text-[15px] mt-1">
                  Kérjük, szíveskedjék átutalni a végösszeget az alábbi adatokkal.
                </p>
              </div>
              <div className="border-2 border-bal-border bg-white rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(181,149,47,0.12)]">
                <div className="bg-bal-subtle border-b border-bal-border text-center py-2.5 px-4">
                  <p className="text-bal-gold-dark font-display font-bold uppercase tracking-[1.5px] text-sm leading-none">Fizetendő</p>
                  <p className="text-bal-ink text-[28px] font-bold leading-tight mt-1">{huf(total)}</p>
                </div>
                <dl className="divide-y divide-bal-border/70 px-4 sm:px-6 text-[15px]">
                  {bankRows().map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[124px_1fr] gap-3 py-1.5 leading-snug">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-bold break-words">{v}</dd>
                    </div>
                  ))}
                  <div className="grid grid-cols-[124px_1fr] gap-3 py-2 items-center">
                    <dt className="text-muted">Közlemény</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[15px] bg-bal-subtle border border-bal-gold rounded-lg px-2.5 py-1 break-all">{memo(ref)}</span>
                      <button type="button" onClick={() => copy("ref", memo(ref))} className="text-sm text-bal-gold-ink font-bold hover:underline cursor-pointer">
                        {copied === "ref" ? "Másolva ✓" : "Másolás"}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-[12.8px] font-semibold text-sold text-center mt-1.5">Kérjük, pontosan ezt a közleményt adja meg!</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-bal-gold bg-bal-subtle px-3.5 py-2">
                <div className="leading-tight">
                  <span className="block text-[12px] text-muted">Az Ön barátkódja</span>
                  <span className="font-mono font-bold text-lg tracking-[2px] text-bal-gold-ink">{ref}</span>
                </div>
                <button type="button" onClick={() => copy("code", ref)} className="text-sm text-bal-gold-ink font-bold hover:underline cursor-pointer">
                  {copied === "code" ? "Másolva ✓" : "Másolás"}
                </button>
              </div>
              <p className="text-[12.5px] text-muted text-center mt-1">Küldje el barátainak, hogy egy asztalhoz ülhessenek.</p>
              <p className="text-[12.5px] text-muted text-center mt-4">
                Visszaigazolót küldtünk a(z) <b className="text-bal-ink break-all">{f.contact.email}</b> címre — kérjük, nézze meg a spam mappát is.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-bal-border bg-white/95 backdrop-blur">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          {step === "fizetes" ? (
            <button type="button" className="btn-ghost w-full" onClick={restart}>
              Új jelentkezés
            </button>
          ) : (
            <>
              {stepIdx > 0 && (
                <button type="button" className="btn-ghost px-4 sm:px-5" aria-label="Vissza" onClick={back}>
                  ←
                </button>
              )}
              <div className="flex-1 min-w-0 leading-tight">
                <span className="block text-[12px] text-muted">Fizetendő</span>
                <span className="block font-bold text-bal-gold-ink text-lg truncate">{huf(total)}</span>
              </div>
              <button type="button" className="btn-primary px-5 text-base sm:px-[30px] sm:text-lg" onClick={next} disabled={submitting}>
                {submitting ? "Küldés…" : step === "veglegesites" ? "Jelentkezés" : "Tovább"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
