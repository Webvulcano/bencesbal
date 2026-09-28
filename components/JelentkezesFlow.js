"use client";
import { useState } from "react";
import { BANK, DEMO_FREE, HALLS, PAYMENT_DEADLINE_DAYS, REF_PREFIX, RELATIONS, SCHOOLS, TICKET_TYPES, ticketType } from "@/lib/constants";

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
  letszam: "Létszám",
  kapcsolat: "Kapcsolattartó",
  lakcim: "Lakcím",
  bences: "Bencés kapcsolat",
  tarsak: "További résztvevők",
  veglegesites: "Véglegesítés",
  fizetes: "Fizetés",
};

const EMPTY = {
  ticketTypeId: "",
  count: 1,
  friendCode: "",
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

function TicketCard({ t, selected, onSelect }) {
  const soldOut = DEMO_FREE[t.hall] === 0;
  const meta = [soldOut && "ELFOGYOTT", t.requires && REQUIRES_LABEL[t.requires], t.maxPeople && `max. ${t.maxPeople} fő`].filter(Boolean);
  return (
    <label
      className={`flex items-center gap-3 rounded-md border px-3.5 py-2.5 transition ${
        soldOut
          ? "border-line bg-[#fafafa] cursor-not-allowed text-muted"
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
      <span className="flex-1 min-w-0 leading-tight">
        <span className="block font-bold">{t.label}</span>
        {meta.length > 0 && (
          <span className="block text-[12px] font-semibold mt-0.5">
            {meta.map((m, i) => (
              <span key={m} className={m === "ELFOGYOTT" ? "text-sold" : "text-muted"}>
                {i > 0 && " · "}
                {m}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className={`font-bold whitespace-nowrap ${soldOut ? "" : "text-navy-2"}`}>
        {huf(t.price)} <span className="font-normal text-muted text-sm">/ fő</span>
      </span>
    </label>
  );
}

export default function JelentkezesFlow() {
  const [stepIdx, setStepIdx] = useState(0);
  const [hall, setHall] = useState("disz");
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const steps = ["jegy", "letszam", "kapcsolat", "lakcim", "bences", ...(f.count > 1 ? ["tarsak"] : []), "veglegesites", "fizetes"];
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

  const setCount = (n) =>
    setF((prev) => {
      const count = Math.max(1, Math.min(20, n || 1));
      const companions = Array.from({ length: count - 1 }, (_, i) => prev.companions[i] || { name: "", email: "" });
      return { ...prev, count, companions };
    });

  const tt = ticketType(f.ticketTypeId);
  const total = tt ? f.count * tt.price : 0;

  function validate() {
    const e = {};
    if (step === "jegy" && !tt) e.ticket = "Válassz jegytípust";
    if (step === "letszam") {
      if (tt?.maxPeople && f.count > tt.maxPeople) e.count = `Ebből a jegyből legfeljebb ${tt.maxPeople} db vehető`;
      if (f.friendCode && !CODE_RE.test(f.friendCode)) e.friendCode = `A barátkód formátuma: ${REF_PREFIX}-1234`;
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
      if (tt?.requires && tt.requires !== f.relation.type)
        e.relation = `A választott jegy csak ${tt.requires === "munkatars" ? "munkatársaknak" : "öregdiákoknak"} szól`;
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
                      <span className="block font-bold">{h.label}</span>
                      <span className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${active ? "text-white/85" : "text-muted"}`}>
                        <span className={`size-2 rounded-full ${free > 0 ? "bg-free" : "bg-sold"}`} />
                        {free > 0 ? `${free} szabad / ${h.capacity}` : "Betelt"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {PUBLIC_TYPES.filter((t) => t.hall === hall).map((t) => (
                  <TicketCard
                    key={t.id}
                    t={t}
                    selected={f.ticketTypeId === t.id}
                    onSelect={() => {
                      set("ticketTypeId", t.id);
                      setErrors({});
                    }}
                  />
                ))}
              </div>
              {errors.ticket && <span className="err mt-2">{errors.ticket}</span>}
            </>
          )}

          {step === "letszam" && tt && (
            <>
              <p className="text-muted mb-4">
                {tt.label} · {huf(tt.price)} / fő
              </p>
              <span className="label">Hány jegyet kérsz?</span>
              <div className="inline-flex items-stretch border border-line rounded-[2px]">
                <button type="button" aria-label="Kevesebb" className="w-12 text-xl text-navy-2 hover:bg-gold-soft disabled:opacity-30" disabled={f.count <= 1} onClick={() => setCount(f.count - 1)}>
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  aria-label="Jegyek száma"
                  className="w-16 text-center text-lg font-bold border-x border-line py-2.5 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  value={f.count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
                <button type="button" aria-label="Több" className="w-12 text-xl text-navy-2 hover:bg-gold-soft disabled:opacity-30" disabled={f.count >= 20} onClick={() => setCount(f.count + 1)}>
                  +
                </button>
              </div>
              <span className="block text-[12.8px] font-semibold text-muted mt-1.5">Egy jelentkezésben max. 20 jegy.</span>
              {errors.count && <span className="err">{errors.count}</span>}

              <div className="mt-6 relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <label htmlFor="friendCode" className="font-bold">
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
                    <p>Ezzel jelzed, hogy kikkel szeretnél <b>egy asztalhoz ülni</b> — akkor is, ha külön jelentkeztek.</p>
                    <p className="mt-1.5">A barátkód <b>ugyanaz, mint az utalás közleménye</b> (pl. {REF_PREFIX}-1234), amit a jelentkezés végén mindenki megkap. Küldd el a barátaidnak, ők pedig írják be ide a sajátjuk jelentkezésekor. Ha te kaptál kódot valakitől, azt írd be.</p>
                    <button type="button" onClick={() => setHelpOpen(false)} className="mt-2 text-gold font-bold text-sm cursor-pointer hover:underline">
                      Értem
                    </button>
                  </div>
                )}
                <div className="flex items-stretch gap-2">
                  <span aria-hidden className="grid place-items-center px-3 rounded-[2px] bg-[#f1f1f1] border border-line text-muted font-mono font-bold tracking-[2px] select-none">
                    {REF_PREFIX}-
                  </span>
                  <input
                    id="friendCode"
                    className="field font-mono font-bold tracking-[4px] w-[110px]"
                    placeholder="1234"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Barátkód, ${REF_PREFIX}- utáni 4 számjegy`}
                    aria-invalid={bad("friendCode")}
                    value={f.friendCode.slice(REF_PREFIX.length + 1)}
                    onChange={(e) => set("friendCode", normalizeCode(e.target.value))}
                  />
                </div>
                <span className="block text-[12.8px] font-semibold text-muted mt-1.5">Egy barátod közlemény-kódja — így egy asztalhoz ültetünk.</span>
                {errors.friendCode && <span className="err">{errors.friendCode}</span>}
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
              <p className="text-muted text-sm mb-3">{f.companions.length} további résztvevő neve és emailje (ide küldjük a jegyeket).</p>
              <div className="max-h-[calc(100dvh-300px)] overflow-y-auto overscroll-contain border border-line/70 rounded-md p-3 space-y-3">
                {f.companions.map((c, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="font-serif text-gold text-xl w-6 pt-2 shrink-0">{i + 2}.</span>
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

          {step === "veglegesites" && tt && (
            <>
              <dl className="text-[15px] divide-y divide-line/60 border-y border-line/60 mb-5">
                {[
                  ["Jegy", `${tt.label} × ${f.count}`],
                  ["Kapcsolattartó", `${f.contact.name} · ${f.contact.email}`],
                  ["Cím", `${f.address.zip} ${f.address.city}, ${f.address.street} ${f.address.no}${f.address.floor ? ", " + f.address.floor : ""}`],
                  ...(f.friendCode ? [["Barátkód", f.friendCode]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold truncate">{v}</dd>
                  </div>
                ))}
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

          {step === "fizetes" && tt && (
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
                    <dt className="text-muted leading-tight">Közlemény<span className="block text-[12px] text-gold font-bold">= barátkód</span></dt>
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
              <p className="text-[13px] text-center mt-2.5 leading-snug">
                <b className="text-navy-2">Ez a barátkódod is.</b> <span className="text-muted">Küldd el a barátaidnak — ha beírják a jelentkezésüknél, egy asztalhoz ültetünk titeket.</span>
              </p>
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
                <button type="button" className="btn-ghost" aria-label="Vissza" onClick={back}>
                  ←
                </button>
              )}
              <div className="flex-1 min-w-0 leading-tight">
                <span className="block text-[12px] text-muted">Fizetendő</span>
                <span className="block font-bold text-navy-2 text-lg truncate">{huf(total)}</span>
              </div>
              <button type="button" className="btn-primary" onClick={next}>
                {step === "veglegesites" ? "Jelentkezés" : "Tovább"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
