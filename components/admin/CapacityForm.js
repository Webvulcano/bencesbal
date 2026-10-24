"use client";
import { useEffect, useState, useTransition } from "react";
import { setCapacity } from "@/app/admin/actions";

// Deliberately two steps (edit → confirm) so the counter is not changed by accident.
export default function CapacityForm({ hallId, label, capacity, taken }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("edit");
  const [value, setValue] = useState(String(capacity));

  const next = Number(value);
  const invalid = !Number.isInteger(next) || next < taken || next > 2000;
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const save = () => {
    const fd = new FormData();
    fd.set("hall", hallId);
    fd.set("capacity", String(next));
    startTransition(async () => {
      const res = await setCapacity(null, fd);
      setState(res);
      if (res?.ok) setOpen(false);
      else setStep("edit");
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => {
          setValue(String(capacity));
          setState(null);
          setStep("edit");
          setOpen(true);
        }}
        className="rounded-md border border-navy-2 text-navy-2 px-3 py-1.5 font-bold hover:bg-navy-2 hover:text-white cursor-pointer"
      >
        Létszám módosítása
      </button>
      {state?.ok && !open && <span className="text-free font-semibold">Mentve ✔</span>}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy/50 backdrop-blur-[2px]" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cap-title-${hallId}`}
            className="w-full max-w-md bg-white rounded-lg shadow-xl border-t-4 border-gold p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {step === "edit" ? (
              <>
                <h2 id={`cap-title-${hallId}`} className="font-serif text-2xl text-navy">
                  {label} — létszám
                </h2>
                <p className="mt-2 text-[15px] text-black/80">
                  Jelenleg <b>{capacity} fő</b>, ebből <b>{taken}</b> foglalt. Nem lehet kevesebb a foglalt helyeknél.
                </p>
                <label className="block mt-4 text-sm">
                  <span className="text-muted">Új férőhely</span>
                  <input
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    type="number"
                    min={taken}
                    max={2000}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="field mt-1.5 w-full tabular-nums"
                  />
                </label>
                {state?.error && <p className="mt-2 text-sold font-semibold text-sm">{state.error}</p>}
                {value !== "" && invalid && (
                  <p className="mt-2 text-sold font-semibold text-sm">
                    {next < taken ? `Kérjük, legalább ${taken} főt adjon meg (ennyi hely már foglalt).` : "Kérjük, adjon meg egy egész számot (max. 2000)."}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={close} className="rounded-md border border-line px-4 py-2 text-sm font-bold text-muted hover:bg-[#f5f5f2] cursor-pointer">
                    Mégse
                  </button>
                  <button
                    type="button"
                    disabled={invalid || next === capacity}
                    onClick={() => setStep("confirm")}
                    className="rounded-md bg-navy-2 text-white px-4 py-2 text-sm font-bold hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mentés
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id={`cap-title-${hallId}`} className="font-serif text-2xl text-navy">
                  Biztosan módosítja?
                </h2>
                <p className="mt-3 text-[15px] text-black/80">
                  {label} férőhelye: <b>{capacity} fő</b> → <b>{next} fő</b>
                  <br />
                  A jelentkezési oldalon azonnal megjelenik.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStep("edit")}
                    className="rounded-md border border-line px-4 py-2 text-sm font-bold text-muted hover:bg-[#f5f5f2] cursor-pointer"
                  >
                    Vissza
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={save}
                    className="rounded-md bg-free text-white px-4 py-2 text-sm font-bold hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {pending ? "…" : "Igen, módosítom"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
