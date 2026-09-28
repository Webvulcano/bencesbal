import { loadAdminData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const SHEETS = [
  ["Résztvevők", "Soronként egy fő: ültetési csoport, jegyszám, név, terem, jegytípus, társaság, ültetési kérés. A társaság tagjai egymás alatt, a barátkóddal összekötött társaságok azonos csoportszámmal, egy színsávban."],
  ["Társaságok", "Soronként egy jelentkezés: kapcsolattartó elérhetősége, tagok, terem, összeg, státusz, dátumok."],
  ["Postázás", "Fizetett, papírjegyet kért jelentkezések címe — borítékos címnyomtatáshoz."],
];

export default async function ExportPage() {
  const { stats } = await loadAdminData();
  return (
    <>
      <h1 className="font-serif text-gold text-3xl mb-2">Excel export</h1>
      <p className="text-muted mb-6">Mindig az aktuális állapotot tölti le. A lemondott jelentkezések a Résztvevők lapon nem szerepelnek.</p>

      <div className="bg-white border border-line/70 rounded-lg p-5 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold">bencesbal-resztvevok.xlsx</p>
            <p className="text-sm text-muted">
              {stats.registrations} társaság · {stats.people} fő
            </p>
          </div>
          <a href="/admin/export/xlsx" className="btn-primary text-base px-6 py-3" download>
            ⤓ Excel letöltése
          </a>
        </div>
        <ul className="mt-5 divide-y divide-line/60 border-t border-line/60">
          {SHEETS.map(([name, desc]) => (
            <li key={name} className="py-3">
              <p className="font-bold text-navy-2">{name}</p>
              <p className="text-sm text-muted">{desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
