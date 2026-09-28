"use client";
import { useEffect, useRef, useState } from "react";
import { BANK, DEMO_FREE, HALLS, PAYMENT_DEADLINE_DAYS, REF_PREFIX, RELATIONS, SCHOOLS, TICKET_TYPES, ticketType } from "@/lib/constants";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => String(2026 - i));
const PUBLIC_TYPES = TICKET_TYPES.filter((t) => !t.adminOnly);
const STEPS = ["Jegyek", "Adatok", "Fizetés"];
const REQUIRES_LABEL = { oregdiak: "csak öregdiákoknak", munkatars: "csak munkatársaknak" };

const EMPTY = {
  ticketTypeId: "",
  count: 1,
  sitTogether: false,
  seatingRequest: "",
  contact: { name: "", email: "", phone: "" },
  address: { zip: "", city: "", street: "", no: "", floor: "" },
  relation: { type: "", school: "", year: "", empCode: "" },
  companions: [],
  paperTicket: false,
  consent: false,
};

function Stepper({ step }) {
  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4">
            <span className="flex items-center gap-2">
              <span
                className={`size-8 rounded-full grid place-items-center text-sm font-bold border-2 transition ${
                  done ? "bg-gold border-gold text-white" : active ? "bg-navy-2 border-navy-2 text-white" : "border-line text-muted"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className={`text-sm sm:text-base ${active ? "font-bold text-navy-2" : "text-muted"}`}>{label}</span>
            </span>
            {n < STEPS.length && <span className={`w-6 sm:w-14 h-px ${done ? "bg-gold" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function Availability() {
  return (
    <section className="border-2 border-gold rounded-lg px-4 sm:px-6 pt-5 pb-6 max-w-3xl mx-auto mb-12">
      <h2 className="font-serif text-gold text-2xl text-center mb-4">Szabad helyek</h2>
      <div className="space-y-3">
        {Object.values(HALLS).map((h) => {
          const free = DEMO_FREE[h.id];
          const ok = free > 0;
          return (
            <div
              key={h.id}
              className={`flex items-center justify-center gap-3 rounded-[5px] border-l-[5px] py-3.5 px-4 font-bold shadow-[0_2px_4px_rgba(0,0,0,0.1)] ${
                ok ? "border-free bg-linear-135 from-[#f8f8f8] to-free-soft" : "border-sold bg-linear-135 from-[#f8f8f8] to-sold-soft"
              }`}
            >
              <span className={`size-3 rounded-full ${ok ? "bg-free ring-2 ring-free/25" : "bg-sold ring-2 ring-sold/25"}`} />
              <span>{h.label}:</span>
              <span className="font-mono">
                {free} szabad / {h.capacity}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TicketCard({ t, selected, onSelect }) {
  const soldOut = DEMO_FREE[t.hall] === 0;
  const meta = [t.requires && REQUIRES_LABEL[t.requires], t.maxPeople && `max. ${t.maxPeople} fő`].filter(Boolean).join(" · ");
  return (
    <label
      className={`relative flex items-center gap-3 rounded-md border px-4 py-3.5 transition ${
        soldOut
          ? "border-line bg-[#fafafa] cursor-not-allowed"
          : selected
            ? "border-navy-2 bg-gold-soft shadow-[inset_5px_0_0_var(--color-gold)] cursor-pointer"
            : "border-line hover:border-navy-2/60 cursor-pointer"
      }`}
    >
      <input type="radio" name="tt" className="sr-only peer" disabled={soldOut} checked={selected} onChange={onSelect} />
      <span
        className={`size-5 shrink-0 rounded-full border grid place-items-center peer-focus-visible:ring-3 peer-focus-visible:ring-gold/40 ${
          selected ? "border-navy-2" : "border-line"
        }`}
      >
        {selected && <span className="size-2.5 rounded-full bg-navy-2" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-bold ${soldOut ? "text-muted" : ""}`}>
          {t.label.replace(/ — (Díszterem|Különterem)$/, "")}
        </span>
        {soldOut && <span className="block text-sold text-[12.8px] tracking-wide font-bold">ELFOGYOTT</span>}
        {meta && <span className="block text-[12.8px] font-semibold text-muted">{meta}</span>}
      </span>
      <span className={`font-bold whitespace-nowrap ${soldOut ? "text-muted" : "text-navy-2"}`}>
        {huf(t.price)} <span className="font-normal text-muted text-sm">/ fő</span>
      </span>
    </label>
  );
}

function Field({ label, hint, error, required, children }) {
  return (
    <div className="mb-5">
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

export default function JelentkezesFlow() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);
  const topRef = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const set = (path, value) =>
    setF((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let o = next;
      keys.slice(0, -1).forEach((k) => (o = o[k]));
      o[keys.at(-1)] = value;
      return next;
    });

  const setCount = (n) =>
    setF((prev) => {
      const count = Math.max(1, Math.min(20, n || 1));
      const companions = Array.from({ length: count - 1 }, (_, i) => prev.companions[i] || { name: "", email: "" });
      return { ...prev, count, companions };
    });

  const tt = ticketType(f.ticketTypeId);

  function validateStep1() {
    const e = {};
    if (!tt) e.ticket = "Válassz jegytípust";
    if (tt?.maxPeople && f.count > tt.maxPeople) e.ticket = `Ebből a jegyből legfeljebb ${tt.maxPeople} db vehető`;
    if (f.sitTogether && !f.seatingRequest.trim()) e.seating = "Írd meg kikkel szeretnél együtt ülni";
    setErrors(e);
    return !Object.keys(e).length;
  }

  function validateStep2() {
    const e = {};
    if (!f.contact.name.trim()) e.name = "Kötelező";
    if (!EMAIL_RE.test(f.contact.email)) e.email = "Érvényes email kell";
    if (!f.contact.phone.trim()) e.phone = "Kötelező";
    ["zip", "city", "street", "no"].forEach((k) => !f.address[k].trim() && (e[k] = "Kötelező"));
    if (!f.relation.type) e.relation = "Válassz egyet";
    if (f.relation.type === "oregdiak" && (!f.relation.school || !f.relation.year)) e.relation = "Add meg az iskolát és évfolyamot";
    if (f.relation.type === "munkatars" && !f.relation.empCode.trim()) e.relation = "Add meg a dolgozói kódot";
    if (tt?.requires && tt.requires !== f.relation.type)
      e.relation = `A választott jegy csak ${tt.requires === "munkatars" ? "munkatársaknak" : "öregdiákoknak"} szól`;
    f.companions.forEach((c, i) => {
      if (!c.name.trim()) e[`c${i}n`] = "Név kell";
      if (!EMAIL_RE.test(c.email)) e[`c${i}e`] = "Email kell";
    });
    if (!f.consent) e.consent = "Kötelező elfogadni";
    setErrors(e);
    return !Object.keys(e).length;
  }

  const bad = (k) => (errors[k] ? "true" : undefined);

  function next() {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) {
      // TODO: mentés DB-be; most csak demo közlemény-kód
      setRef(`${REF_PREFIX}-${String(Math.floor(1000 + Math.random() * 9000))}`);
      setStep(3);
    }
  }

  function restart() {
    setF(EMPTY);
    setErrors({});
    setRef("");
    setCopied(false);
    setStep(1);
  }

  async function copyRef() {
    await navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={topRef} className="scroll-mt-6">
      <Stepper step={step} />

      {step === 1 && (
        <>
          <Availability />
          <section>
            <h2 className="h-section">Jegyigénylés</h2>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
              {Object.values(HALLS).map((h) => (
                <div key={h.id}>
                  <h3 className="font-serif text-xl text-navy mb-3">{h.label}</h3>
                  <div className="space-y-2.5">
                    {PUBLIC_TYPES.filter((t) => t.hall === h.id).map((t) => (
                      <TicketCard key={t.id} t={t} selected={f.ticketTypeId === t.id} onSelect={() => { set("ticketTypeId", t.id); setErrors((e) => ({ ...e, ticket: undefined })); }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.ticket && <span className="err mt-3">{errors.ticket}</span>}

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-10">
              <div>
                <span className="label">Jegyek száma</span>
                <div className="inline-flex items-stretch border border-line rounded-[2px]">
                  <button type="button" aria-label="Kevesebb" className="w-11 text-xl text-navy-2 hover:bg-gold-soft disabled:opacity-30" disabled={f.count <= 1} onClick={() => setCount(f.count - 1)}>
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    aria-label="Jegyek száma"
                    className="w-14 text-center font-bold border-x border-line py-2.5 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    value={f.count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                  <button type="button" aria-label="Több" className="w-11 text-xl text-navy-2 hover:bg-gold-soft disabled:opacity-30" disabled={f.count >= 20} onClick={() => setCount(f.count + 1)}>
                    +
                  </button>
                </div>
                <span className="block text-[12.8px] font-semibold text-muted mt-2">Egy jelentkezésben max. 20 jegy.</span>
              </div>

              <div>
                <Check checked={f.sitTogether} onChange={(e) => set("sitTogether", e.target.checked)}>
                  <b>Másokkal együtt szeretnék ülni</b>
                  <span className="block text-[12.8px] font-semibold text-muted">akkor is, ha ők külön jelentkeznek</span>
                </Check>
                {f.sitTogether && (
                  <div className="mt-3">
                    <textarea
                      rows={3}
                      className="field"
                      aria-invalid={bad("seating")}
                      placeholder="Kikkel? Nevek / társaság neve, pl. 2012-es osztály"
                      value={f.seatingRequest}
                      onChange={(e) => set("seatingRequest", e.target.value)}
                    />
                    {errors.seating && <span className="err">{errors.seating}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 border-t-[1.5px] border-gold pt-4 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted">{tt ? `${tt.label} · ${f.count} × ${huf(tt.price)}` : "Válassz jegytípust"}</span>
              <span className="text-lg">
                Fizetendő: <b className="text-navy-2 text-2xl">{huf(tt ? f.count * tt.price : 0)}</b>
              </span>
            </div>
          </section>
        </>
      )}

      {step === 2 && (
        <section className="grid md:grid-cols-2 gap-x-10">
          <div>
            <h2 className="h-section">Alapadatok</h2>
            <Field label="Név" required error={errors.name}>
              <input className="field" autoComplete="name" aria-invalid={bad("name")} value={f.contact.name} onChange={(e) => set("contact.name", e.target.value)} />
            </Field>
            <Field label="Email" required hint="visszaigazolások / fizetési információ miatt kötelező" error={errors.email}>
              <input className="field" type="email" autoComplete="email" aria-invalid={bad("email")} value={f.contact.email} onChange={(e) => set("contact.email", e.target.value)} />
            </Field>
            <Field label="Telefon" required error={errors.phone}>
              <input className="field" type="tel" autoComplete="tel" aria-invalid={bad("phone")} value={f.contact.phone} onChange={(e) => set("contact.phone", e.target.value)} />
            </Field>

            <h2 className="h-section mt-4">Lakcím</h2>
            <div className="grid grid-cols-[110px_1fr] gap-x-3">
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
          </div>

          <div>
            <h2 className="h-section mt-6 md:mt-0">Bencés kapcsolat</h2>
            <p className="label">
              Hogy kapcsolódik bencés közösségünkhöz?<span className="text-gold"> *</span>
            </p>
            <div className="space-y-3 mt-3">
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
                <Field label="Dolgozói kód">
                  <input className="field" value={f.relation.empCode} onChange={(e) => set("relation.empCode", e.target.value)} />
                </Field>
              </div>
            )}
            {errors.relation && <span className="err mt-2">{errors.relation}</span>}

            {f.companions.length > 0 && (
              <>
                <h2 className="h-section mt-10">További résztvevők ({f.companions.length} fő)</h2>
                <div className="space-y-4">
                  {f.companions.map((c, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="font-serif text-gold text-xl w-6 pt-2">{i + 2}.</span>
                      <div className="flex-1 grid sm:grid-cols-2 gap-2">
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
                  ))}
                </div>
              </>
            )}

            <div className="mt-10 space-y-4">
              <Check checked={f.paperTicket} onChange={(e) => set("paperTicket", e.target.checked)}>
                Papír alapú jegyet is kérek postán
              </Check>
              <div>
                <Check checked={f.consent} onChange={(e) => set("consent", e.target.checked)}>
                  Az{" "}
                  <a href="https://jelentkezes.gyoribencesbal.hu/adatkezelesi.pdf" target="_blank" rel="noopener" className="text-navy-2 underline">
                    adatkezelési szabályzatban
                  </a>{" "}
                  foglaltakat elolvastam, megértettem és elfogadom.<span className="text-gold"> *</span>
                </Check>
                {errors.consent && <span className="err ml-8">{errors.consent}</span>}
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 3 && tt && (
        <section className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-serif text-gold text-3xl">Köszönjük a jelentkezést, {f.contact.name}!</h2>
            <p className="text-muted mt-2">
              Kérjük, az alábbi adatokkal utald át a jegyek árát <b className="text-black">{PAYMENT_DEADLINE_DAYS} napon belül</b>.
            </p>
          </div>

          <div className="border-2 border-gold rounded-lg overflow-hidden">
            <div className="bg-navy text-center py-6 px-4">
              <p className="text-gold font-serif text-xl">Fizetendő</p>
              <p className="text-white text-4xl font-bold mt-1">{huf(f.count * tt.price)}</p>
            </div>
            <dl className="divide-y divide-line/60 px-5 sm:px-7">
              {[
                ["Kedvezményezett", BANK.beneficiary],
                ["Bank", BANK.bankName],
                ["Számlaszám", BANK.account],
                ["IBAN", BANK.iban],
              ].map(([k, v]) => (
                <div key={k} className="grid sm:grid-cols-[160px_1fr] gap-x-4 gap-y-0.5 py-3">
                  <dt className="text-muted text-sm sm:text-base">{k}</dt>
                  <dd className="font-bold break-words">{v}</dd>
                </div>
              ))}
              <div className="grid sm:grid-cols-[160px_1fr] gap-x-4 gap-y-1 py-4">
                <dt className="text-muted text-sm sm:text-base sm:pt-2">Közlemény</dt>
                <dd>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xl bg-gold-soft border border-gold rounded px-3 py-1.5 tracking-wider">{ref}</span>
                    <button type="button" onClick={copyRef} className="text-sm text-navy-2 font-bold hover:underline cursor-pointer">
                      {copied ? "Másolva ✓" : "Másolás"}
                    </button>
                  </div>
                  <span className="block text-[12.8px] font-semibold text-sold mt-1.5">Kérjük, pontosan ezt írd be — ez alapján azonosítjuk az utalást.</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8">
            <h3 className="h-section">Összegzés</h3>
            <div className="flex justify-between gap-4">
              <span>
                {tt.label}{!tt.label.includes(HALLS[tt.hall].label) && <span className="text-muted"> ({HALLS[tt.hall].label})</span>}
              </span>
              <span className="whitespace-nowrap">
                {f.count} × {huf(tt.price)}
              </span>
            </div>
            {f.companions.length > 0 && <p className="mt-2 text-muted">Résztvevők: {[f.contact.name, ...f.companions.map((c) => c.name)].join(", ")}</p>}
            {f.sitTogether && <p className="mt-2 text-muted">Ültetési kérés: {f.seatingRequest}</p>}
            {f.paperTicket && <p className="mt-2 text-muted">Papírjegyet postán is küldünk.</p>}
          </div>

          <div className="flex justify-center mt-10">
            <button type="button" className="btn-ghost" onClick={restart}>
              Új jelentkezés
            </button>
          </div>
        </section>
      )}

      {step < 3 && (
        <div className="flex flex-col-reverse sm:flex-row justify-center items-center gap-3 mt-12">
          {step > 1 && (
            <button type="button" className="btn-ghost" onClick={() => { setErrors({}); setStep(step - 1); }}>
              Vissza
            </button>
          )}
          <button type="button" className="btn-primary" onClick={next}>
            {step === 2 ? "Jelentkezés" : "Tovább"}
          </button>
        </div>
      )}
    </div>
  );
}
