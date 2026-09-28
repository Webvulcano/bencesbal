"use client";
import { useState } from "react";
import { BANK, DEMO_FREE, HALLS, PAYMENT_DEADLINE_DAYS, REF_PREFIX, RELATIONS, SCHOOLS, TICKET_TYPES } from "@/lib/constants";

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

const PRIVACY_URL = "https://jelentkezes.gyoribencesbal.hu/adatkezelesi.pdf";

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

const EMPTY = {
  qty: {},
  friendCodes: [""],
  contact: { name: "", email: "", phone: "" },
  address: { zip: "", city: "", street: "", no: "", floor: "" },
  relation: { type: "", school: "", year: "", empCode: "" },
  companions: [],
  paperTicket: false,
  consent: false,
};

function Field({ label, hint, error, required, children }) {
  return (
    <div className="mb-3.5">
      <label className="label">
        {label}
        {required && <span className="text-gold"> *</span>}
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
      <span className="box">{checked && (type === "radio" ? <span className="size-2.5 rounded-full bg-navy-2" /> : "✔")}</span>
      <span>{children}</span>
    </label>
  );
}

function TicketCard({ t, qty, max, onQty }) {
  const soldOut = DEMO_FREE[t.hall] === 0;
  const meta = [soldOut && "ELFOGYOTT", t.requires && REQUIRES_LABEL[t.requires], t.maxPeople && `max. ${t.maxPeople} fő`].filter(Boolean);
  const active = qty > 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-md border pl-3.5 pr-2 py-2 transition ${
        soldOut ? "border-line bg-[#fafafa] text-muted" : active ? "border-navy-2 bg-gold-soft shadow-[inset_5px_0_0_var(--color-gold)]" : "border-line"
      }`}
    >
      <span className="flex-1 min-w-0 leading-tight">
        <span className="block font-bold">{t.label}</span>
        <span className="block text-[13px] mt-0.5">
          <b className={soldOut ? "" : "text-navy-2"}>{huf(t.price)}</b> <span className="text-muted">/ fő</span>
          {meta.map((m) => (
            <span key={m} className={`font-semibold ${m === "ELFOGYOTT" ? "text-sold" : "text-muted"}`}>
              {" · "}
              {m}
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
          className="size-9 rounded-full border border-navy-2/40 text-navy-2 text-xl leading-none grid place-items-center cursor-pointer hover:bg-white disabled:opacity-25 disabled:cursor-default"
        >
          −
        </button>
        <span className={`w-8 text-center font-bold text-lg tabular-nums ${active ? "text-navy-2" : "text-muted"}`} aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          aria-label={`${t.label}: több`}
          disabled={soldOut || qty >= max}
          onClick={() => onQty(qty + 1)}
          className="size-9 rounded-full bg-navy-2 text-white text-xl leading-none grid place-items-center cursor-pointer hover:bg-navy disabled:opacity-25 disabled:cursor-default"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TicketTag({ t }) {
  if (!t) return null;
  const tier = t.id.endsWith("_arany") ? "bg-gold text-navy" : t.id.endsWith("_ezust") ? "bg-[#e4e7ee] text-navy-2" : "bg-navy-2 text-white";
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

  const count = Object.values(f.qty).reduce((a, b) => a + b, 0);
  const total = PUBLIC_TYPES.reduce((sum, t) => sum + (f.qty[t.id] || 0) * t.price, 0);
  const seats = PUBLIC_TYPES.flatMap((t) => Array(f.qty[t.id] || 0).fill(t));
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
    if (step === "jegy" && count < 1) e.ticket = "Válassz legalább 1 jegyet";
    if (step === "letszam") {
      f.friendCodes.forEach((c, i) => {
        if (c && !CODE_RE.test(c)) e[`fc${i}`] = `A barátkód formátuma: ${REF_PREFIX}-1234`;
      });
    }
    if (step === "kapcsolat") {
      if (!f.contact.name.trim()) e.name = "Kötelező";
      if (!EMAIL_RE.test(f.contact.email)) e.email = "Érvényes email kell";
      if (!f.contact.phone.trim()) e.phone = "Kötelező";
    }
    if (step === "lakcim") ["zip", "city", "street", "no"].forEach((k) => !f.address[k].trim() && (e[k] = "Kötelező"));
    if (step === "bences") {
      if (!f.relation.type) e.relation = "Válassz egyet";
      if (f.relation.type === "oregdiak" && (!f.relation.school || !f.relation.year)) e.relation = "Add meg az iskolát és évfolyamot";
      if (f.relation.type === "munkatars" && !f.relation.empCode.trim()) e.relation = "Add meg a dolgozói kódot";
    }
    if (step === "tarsak")
      f.companions.forEach((c, i) => {
        if (!c.name.trim()) e[`c${i}n`] = "Név kell";
        if (!EMAIL_RE.test(c.email)) e[`c${i}e`] = "Email kell";
      });
    if (step === "veglegesites" && !f.consent) e.consent = "Kötelező elfogadni";
    setErrors(e);
    return !Object.keys(e).length;
  }

  const bad = (k) => (errors[k] ? "true" : undefined);

  function next() {
    if (!validate()) return;
    if (step === "veglegesites") {
      // TODO: mentés DB-be; most csak demo közlemény-kód
      setRef(`${REF_PREFIX}-${String(Math.floor(1000 + Math.random() * 9000))}`);
    }
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
            <h1 className="font-serif text-gold text-[26px] sm:text-3xl leading-none">{STEP_TITLES[step]}</h1>
            <span className="text-sm text-muted whitespace-nowrap">
              {stepIdx + 1} / {formSteps}
            </span>
          </div>
          <div className="h-[3px] bg-line/50 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-navy-2 transition-all duration-300" style={{ width: `${((stepIdx + 1) / formSteps) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-xl w-full mx-auto px-4 py-4 sm:py-6">
          {step === "jegy" && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3" role="tablist">
                {Object.values(HALLS).map((h) => {
                  const free = DEMO_FREE[h.id];
                  const active = hall === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setHall(h.id)}
                      className={`rounded-md border-2 px-3 py-2 text-left transition cursor-pointer ${active ? "border-navy-2 bg-navy-2 text-white" : "border-line hover:border-navy-2/50"}`}
                    >
                      <span className="flex items-center justify-between gap-2 font-bold">
                        {h.label}
                        {(() => {
                          const n = PUBLIC_TYPES.filter((t) => t.hall === h.id).reduce((a, t) => a + (f.qty[t.id] || 0), 0);
                          return n > 0 ? <span className={`text-[12px] rounded-full px-2 py-0.5 ${active ? "bg-gold text-navy" : "bg-gold-soft text-navy-2"}`}>{n} db</span> : null;
                        })()}
                      </span>
                      <span className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${active ? "text-white/85" : "text-muted"}`}>
                        <span className={`size-2 rounded-full ${free > 0 ? "bg-free" : "bg-sold"}`} />
                        {free > 0 ? `${free} szabad / ${h.capacity}` : "Betelt"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {PUBLIC_TYPES.filter((t) => t.hall === hall).map((t) => {
                  const q = f.qty[t.id] || 0;
                  return (
                    <TicketCard
                      key={t.id}
                      t={t}
                      qty={q}
                      max={Math.min(20 - (count - q), t.maxPeople ?? 20)}
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
              <p className="text-muted mb-5">Szeretnél a barátaiddal egy asztalhoz ülni? Ha kaptál tőlük barátkódot, írd be ide.</p>
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
                    className={`size-5 rounded-full border text-[12px] font-bold grid place-items-center cursor-pointer transition ${helpOpen ? "bg-navy-2 border-navy-2 text-white" : "border-navy-2 text-navy-2 hover:bg-gold-soft"}`}
                  >
                    ?
                  </button>
                </div>
                {helpOpen && (
                  <div role="tooltip" className="absolute z-20 left-0 right-0 top-8 bg-navy text-white text-[14px] leading-snug rounded-md p-3.5 shadow-lg border-l-4 border-gold">
                    <p className="font-bold text-gold mb-1">Mi az a barátkód?</p>
                    <p>
                      A fizetés végén <b>mindenki kap egy barátkódot</b> (pl. {REF_PREFIX}-1234).
                    </p>
                    <p className="mt-1.5">
                      Ezzel jelzed, hogy kikkel szeretnél <b>egy asztalhoz ülni</b>, akkor is, ha külön jelentkeztek. Ha egy barátod már jelentkezett, kérd el a kódját, és írd be ide.
                    </p>
                    <button type="button" onClick={() => setHelpOpen(false)} className="mt-2 text-gold font-bold text-sm cursor-pointer hover:underline">
                      Értem
                    </button>
                  </div>
                )}
                <div className="space-y-2 max-h-[calc(100dvh-430px)] min-h-[52px] overflow-y-auto overscroll-contain">
                  {f.friendCodes.map((code, i) => (
                    <div key={i}>
                      <div className="flex items-stretch gap-2">
                        <span aria-hidden className="grid place-items-center px-3 rounded-[2px] bg-[#f1f1f1] border border-line text-muted font-mono font-bold tracking-[2px] select-none">
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
                    className="mt-2.5 text-navy-2 font-bold text-[15px] hover:underline cursor-pointer"
                  >
                    + Újabb barátkód
                  </button>
                )}
                <span className="block text-[12.8px] font-semibold text-muted mt-1.5">Barátaid közlemény-kódjai — így egy asztalhoz ültetünk titeket.</span>
              </div>
            </>
          )}

          {step === "kapcsolat" && (
            <>
              <Field label="Név" required error={errors.name}>
                <input className="field" autoComplete="name" aria-invalid={bad("name")} value={f.contact.name} onChange={(e) => set("contact.name", e.target.value)} />
              </Field>
              <Field label="Email" required hint="visszaigazolások / fizetési információ miatt kötelező" error={errors.email}>
                <input className="field" type="email" autoComplete="email" aria-invalid={bad("email")} value={f.contact.email} onChange={(e) => set("contact.email", e.target.value)} />
              </Field>
              <Field label="Telefon" required error={errors.phone}>
                <input className="field" type="tel" autoComplete="tel" aria-invalid={bad("phone")} value={f.contact.phone} onChange={(e) => set("contact.phone", e.target.value)} />
              </Field>
            </>
          )}

          {step === "lakcim" && (
            <>
              <div className="grid grid-cols-[96px_1fr] gap-x-3">
                <Field label="Irsz." required error={errors.zip}>
                  <input className="field" inputMode="numeric" maxLength={4} autoComplete="postal-code" aria-invalid={bad("zip")} value={f.address.zip} onChange={(e) => set("address.zip", e.target.value)} />
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
                  <input className="field" aria-invalid={bad("no")} value={f.address.no} onChange={(e) => set("address.no", e.target.value)} />
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
                Hogy kapcsolódik bencés közösségünkhöz?<span className="text-gold"> *</span>
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
                    <option value="">Hol érettségiztél?</option>
                    {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className="field" value={f.relation.year} onChange={(e) => set("relation.year", e.target.value)}>
                    <option value="">Évfolyam</option>
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
              <p className="text-muted text-sm mb-3">Add meg, kinek szól a többi jegy — a jegyet emailben küldjük nekik.</p>
              <div className="max-h-[calc(100dvh-290px)] overflow-y-auto overscroll-contain border border-line/70 rounded-md divide-y divide-line/60">
                <div className="flex gap-2.5 items-start px-3 py-2.5">
                  <span className="font-serif text-gold text-xl w-6 pt-1.5 shrink-0">1.</span>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <TicketTag t={seats[0]} />
                      <span className="text-[12px] text-muted">kapcsolattartó</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input className="field disabled:bg-[#f4f4f4] disabled:text-muted disabled:cursor-not-allowed" aria-label="Kapcsolattartó neve" value={f.contact.name} disabled />
                      <input className="field disabled:bg-[#f4f4f4] disabled:text-muted disabled:cursor-not-allowed" aria-label="Kapcsolattartó emailje" value={f.contact.email} disabled />
                    </div>
                  </div>
                </div>
                {f.companions.map((c, i) => (
                  <div key={i} className="flex gap-2.5 items-start px-3 py-2.5">
                    <span className="font-serif text-gold text-xl w-6 pt-1.5 shrink-0">{i + 2}.</span>
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
                          <input className="field" type="email" placeholder="Email" aria-invalid={bad(`c${i}e`)} value={c.email} onChange={(e) => set(`companions.${i}.email`, e.target.value)} />
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
              <dl className="text-[15px] divide-y divide-line/60 border-y border-line/60 mb-5 max-h-[calc(100dvh-400px)] overflow-y-auto overscroll-contain pr-1">
                {[
                  ["Jegy", lines.join("\n")],
                  ["Kapcsolattartó", `${f.contact.name}\n${f.contact.email}\n${f.contact.phone}`],
                  ["Cím", `${f.address.zip} ${f.address.city}, ${f.address.street} ${f.address.no}${f.address.floor ? ", " + f.address.floor : ""}`],
                  ...(f.friendCodes.some(Boolean) ? [["Barátkód", f.friendCodes.filter(Boolean).join(", ")]] : []),
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
                <Check checked={f.paperTicket} onChange={(e) => set("paperTicket", e.target.checked)}>
                  Papír alapú jegyet is kérek postán
                </Check>
                <div>
                  <Check checked={f.consent} onChange={(e) => set("consent", e.target.checked)}>
                    Az{" "}
                    <a href={PRIVACY_URL} target="_blank" rel="noopener" className="text-navy-2 underline">
                      adatkezelési szabályzatban
                    </a>{" "}
                    foglaltakat elolvastam, megértettem és elfogadom.<span className="text-gold"> *</span>
                  </Check>
                  {errors.consent && <span className="err ml-8">{errors.consent}</span>}
                </div>
              </div>
            </>
          )}

          {step === "fizetes" && (
            <>
              <div className="text-center mb-3">
                <h1 className="font-serif text-gold text-2xl sm:text-3xl leading-tight">Köszönjük, {f.contact.name}!</h1>
                <p className="text-muted text-[15px] mt-1">
                  Utald át <b className="text-black">{PAYMENT_DEADLINE_DAYS} napon belül</b> az alábbi adatokkal.
                </p>
              </div>
              <div className="border-2 border-gold rounded-lg overflow-hidden">
                <div className="bg-navy text-center py-2.5 px-4">
                  <p className="text-gold font-serif text-lg leading-none">Fizetendő</p>
                  <p className="text-white text-[28px] font-bold leading-tight">{huf(total)}</p>
                </div>
                <dl className="divide-y divide-line/60 px-4 sm:px-6 text-[15px]">
                  {[
                    ["Kedvezm.", BANK.beneficiary],
                    ["Számlaszám", `${BANK.account} (${BANK.bankName})`],
                    ["IBAN", BANK.iban],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[96px_1fr] gap-3 py-1.5 leading-snug">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-bold break-words">{v}</dd>
                    </div>
                  ))}
                  <div className="grid grid-cols-[96px_1fr] gap-3 py-2 items-center">
                    <dt className="text-muted">Közlemény</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg bg-gold-soft border border-gold rounded px-2.5 py-1 tracking-wider">{ref}</span>
                      <button type="button" onClick={() => copy("ref", ref)} className="text-sm text-navy-2 font-bold hover:underline cursor-pointer">
                        {copied === "ref" ? "Másolva ✓" : "Másolás"}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-[12.8px] font-semibold text-sold text-center mt-1.5">Pontosan ezt a közleményt írd be!</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-gold bg-gold-soft px-3.5 py-2">
                <div className="leading-tight">
                  <span className="block text-[12px] text-muted">A te barátkódod</span>
                  <span className="font-mono font-bold text-lg tracking-[2px] text-navy-2">{ref}</span>
                </div>
                <button type="button" onClick={() => copy("code", ref)} className="text-sm text-navy-2 font-bold hover:underline cursor-pointer">
                  {copied === "code" ? "Másolva ✓" : "Másolás"}
                </button>
              </div>
              <p className="text-[12.5px] text-muted text-center mt-1">Küldd el a barátaidnak, hogy egy asztalhoz ülhessetek.</p>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-line/70 bg-white/95 backdrop-blur">
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
                <span className="block font-bold text-navy-2 text-lg truncate">{huf(total)}</span>
              </div>
              <button type="button" className="btn-primary px-5 text-base sm:px-[30px] sm:text-lg" onClick={next}>
                {step === "veglegesites" ? "Jelentkezés" : "Tovább"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
