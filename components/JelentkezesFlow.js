"use client";
import { useState } from "react";
import { BANK, HALLS, PAYMENT_DEADLINE_DAYS, REF_PREFIX, RELATIONS, SCHOOLS, TICKET_TYPES, ticketType } from "@/lib/constants";

const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => String(2026 - i));
const PUBLIC_TYPES = TICKET_TYPES.filter((t) => !t.adminOnly);

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

const input = "border px-2 py-1 w-full";

export default function JelentkezesFlow() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [ref, setRef] = useState("");

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

  const err = (k) => (errors[k] ? <span className="text-red-600 text-sm"> {errors[k]}</span> : null);

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
    setStep(1);
  }

  return (
    <div className="space-y-4">
      <p>Lépés {step} / 3</p>

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="font-bold">1. Jegytípus</h2>
          {PUBLIC_TYPES.map((t) => (
            <label key={t.id} className="block">
              <input type="radio" name="tt" checked={f.ticketTypeId === t.id} onChange={() => set("ticketTypeId", t.id)} />{" "}
              {t.label} — {huf(t.price)} / fő ({HALLS[t.hall].label}){t.maxPeople ? ` — max ${t.maxPeople} fő` : ""}
            </label>
          ))}
          {err("ticket")}
          <label className="block">
            Jegyek száma:{" "}
            <input type="number" min={1} max={20} className="border px-2 py-1 w-20" value={f.count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
          <label className="block">
            <input type="checkbox" checked={f.sitTogether} onChange={(e) => set("sitTogether", e.target.checked)} /> Másokkal együtt szeretnék ülni
            (akkor is, ha ők külön jelentkeznek)
          </label>
          {f.sitTogether && (
            <div>
              <textarea
                className={input}
                placeholder="Kikkel? Nevek / társaság neve, pl. 2012-es osztály"
                value={f.seatingRequest}
                onChange={(e) => set("seatingRequest", e.target.value)}
              />
              {err("seating")}
            </div>
          )}
          {tt && <p>Összesen: {f.count} × {huf(tt.price)} = <b>{huf(f.count * tt.price)}</b></p>}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h2 className="font-bold">2. Alapadatok</h2>
          <h3 className="font-semibold">Kapcsolattartó (1. résztvevő)</h3>
          <label className="block">Név * {err("name")}<input className={input} value={f.contact.name} onChange={(e) => set("contact.name", e.target.value)} /></label>
          <label className="block">Email * {err("email")}<input className={input} type="email" value={f.contact.email} onChange={(e) => set("contact.email", e.target.value)} /></label>
          <label className="block">Telefon * {err("phone")}<input className={input} type="tel" value={f.contact.phone} onChange={(e) => set("contact.phone", e.target.value)} /></label>

          <h3 className="font-semibold">Lakcím</h3>
          <label className="block">Irányítószám * {err("zip")}<input className={input} inputMode="numeric" maxLength={4} value={f.address.zip} onChange={(e) => set("address.zip", e.target.value)} /></label>
          <label className="block">Település * {err("city")}<input className={input} value={f.address.city} onChange={(e) => set("address.city", e.target.value)} /></label>
          <label className="block">Utca / tér * {err("street")}<input className={input} value={f.address.street} onChange={(e) => set("address.street", e.target.value)} /></label>
          <label className="block">Házszám * {err("no")}<input className={input} value={f.address.no} onChange={(e) => set("address.no", e.target.value)} /></label>
          <label className="block">Emelet / ajtó<input className={input} value={f.address.floor} onChange={(e) => set("address.floor", e.target.value)} /></label>

          <h3 className="font-semibold">Kapcsolat a bencés közösséghez * {err("relation")}</h3>
          {RELATIONS.map((r) => (
            <label key={r.id} className="block">
              <input type="radio" name="rel" checked={f.relation.type === r.id} onChange={() => set("relation.type", r.id)} /> {r.label}
            </label>
          ))}
          {f.relation.type === "oregdiak" && (
            <div className="flex gap-2">
              <select className="border px-2 py-1" value={f.relation.school} onChange={(e) => set("relation.school", e.target.value)}>
                <option value="">Hol érettségiztél?</option>
                {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="border px-2 py-1" value={f.relation.year} onChange={(e) => set("relation.year", e.target.value)}>
                <option value="">Évfolyam</option>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          )}
          {f.relation.type === "munkatars" && (
            <label className="block">Dolgozói kód<input className={input} value={f.relation.empCode} onChange={(e) => set("relation.empCode", e.target.value)} /></label>
          )}

          {f.companions.length > 0 && (
            <>
              <h3 className="font-semibold">További résztvevők ({f.companions.length} fő)</h3>
              {f.companions.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span>{i + 2}.</span>
                  <div className="flex-1">
                    <input className={input} placeholder="Név" value={c.name} onChange={(e) => set(`companions.${i}.name`, e.target.value)} />
                    {err(`c${i}n`)}
                  </div>
                  <div className="flex-1">
                    <input className={input} type="email" placeholder="Email" value={c.email} onChange={(e) => set(`companions.${i}.email`, e.target.value)} />
                    {err(`c${i}e`)}
                  </div>
                </div>
              ))}
            </>
          )}

          <label className="block">
            <input type="checkbox" checked={f.paperTicket} onChange={(e) => set("paperTicket", e.target.checked)} /> Papír alapú jegyet is kérek postán
          </label>
          <label className="block">
            <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /> Az adatkezelési tájékoztatót elolvastam és elfogadom. * {err("consent")}
          </label>
        </section>
      )}

      {step === 3 && tt && (
        <section className="space-y-2">
          <h2 className="font-bold">3. Fizetés — átutalással</h2>
          <p>Köszönjük a jelentkezést, {f.contact.name}!</p>
          <p>{tt.label}: {f.count} × {huf(tt.price)}</p>
          <p>Fizetendő: <b>{huf(f.count * tt.price)}</b></p>
          <p>Kedvezményezett: <b>{BANK.beneficiary}</b></p>
          <p>Bank: {BANK.bankName}</p>
          <p>Számlaszám: <b>{BANK.account}</b> (IBAN: {BANK.iban})</p>
          <p>Közlemény: <b>{ref}</b> — kérjük, pontosan ezt írd be!</p>
          <p>Határidő: {PAYMENT_DEADLINE_DAYS} napon belül.</p>
          {f.sitTogether && <p>Ültetési kérés: {f.seatingRequest}</p>}
          <button className="border px-3 py-1" onClick={restart}>Új jelentkezés</button>
        </section>
      )}

      {step < 3 && (
        <div className="flex gap-2">
          {step > 1 && <button className="border px-3 py-1" onClick={() => { setErrors({}); setStep(step - 1); }}>Vissza</button>}
          <button className="border px-3 py-1 font-bold" onClick={next}>{step === 2 ? "Jelentkezés elküldése" : "Tovább"}</button>
        </div>
      )}
    </div>
  );
}
