// `npm test`: runs Vitest, then always writes test-results/teszt-riport.pdf (also when tests fail).
// Exit code is Vitest's, so a failing suite still fails the command.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";

const OUT = "test-results";
const JSON_FILE = path.join(OUT, "results.json");
const PDF_FILE = path.join(OUT, "teszt-riport.pdf");

// What each test file covers, in plain words for the report.
const ABOUT = {
  "recipients.test.js": ["Ki melyik jegyet kapja", "Fizetés után melyik jegy kinek az email-címére megy. Adatbázis és email nélkül, csak a döntési logika."],
  "actions.test.js": ["Admin gombok → emailek", "Fizetve / Lemondás / Kézi vendég felvétele: pontosan kinek, milyen email megy ki, mi van csatolva, és mi rögzül. Hamis adatbázissal és hamis levélküldővel — valódi email nem megy ki."],
  "emails.test.js": ["Email-szövegek", "A bál neve, az ügyfél sablonjai szerinti szövegek, egyes/többes szám, csatolt jegyek."],
  "admin-access.test.js": ["Admin jogosultság", "Ki léphet be az adminba: csak Google-lel belépett, engedélyezett (ADMIN_EMAILS) email-cím. Más cím, jelszavas belépés vagy üres lista → nincs belépés."],
  "pdf.test.js": ["PDF-jegy", "Valódi PDF-belépőjegy készül, résztvevőnként 1 oldal, ékezetes nevekkel."],
};

mkdirSync(OUT, { recursive: true });
const run = spawnSync("npx", ["vitest", "run", "--reporter=default", "--reporter=json", `--outputFile.json=${JSON_FILE}`], { stdio: "inherit" });

let results;
try {
  results = JSON.parse(readFileSync(JSON_FILE, "utf8"));
} catch {
  console.error("Nem készült teszt-eredmény, PDF nem generálható.");
  process.exit(run.status || 1);
}

const NAVY = [17, 34, 80];
const GOLD = [205, 172, 67];
const MUTED = [110, 110, 120];
const INK = [25, 25, 30];
const OK = [30, 130, 70];
const BAD = [190, 40, 40];

const doc = new jsPDF({ unit: "mm", format: "a4" });
for (const [file, style] of [["Inter_400Regular.ttf", "normal"], ["Inter_700Bold.ttf", "bold"]]) {
  doc.addFileToVFS(file, readFileSync(path.join("public", "fonts", file)).toString("base64"));
  doc.addFont(file, "Inter", style);
}

const W = 210;
const M = 16;
let y = 0;
const ensure = (h) => {
  if (y + h > 282) {
    doc.addPage();
    y = 18;
  }
};
const text = (s, x, size, { bold = false, color = INK, width } = {}) => {
  doc.setFont("Inter", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = width ? doc.splitTextToSize(s, width) : [s];
  doc.text(lines, x, y);
  return lines.length * size * 0.42;
};

const passed = results.numPassedTests;
const failed = results.numFailedTests;
const total = results.numTotalTests;
const allOk = failed === 0 && results.success;
const started = new Date(results.startTime);
const secs = (Math.max(...results.testResults.map((f) => f.endTime)) - results.startTime) / 1000;

// header band
doc.setFillColor(...NAVY);
doc.rect(0, 0, W, 30, "F");
doc.setFillColor(...GOLD);
doc.rect(0, 30, W, 1.2, "F");
y = 14;
text("Teszt-riport", M, 18, { bold: true, color: GOLD });
y = 22;
text(`Győri Bencés Bál — jelentkezési app · ${started.toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}`, M, 9.5, { color: [255, 255, 255] });

// summary box
y = 40;
doc.setFillColor(...(allOk ? [232, 245, 236] : [251, 234, 234]));
doc.setDrawColor(...(allOk ? OK : BAD));
doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, "FD");
y += 9;
text(allOk ? "MINDEN TESZT SIKERES" : `${failed} TESZT HIBÁS`, M + 6, 14, { bold: true, color: allOk ? OK : BAD });
y += 7;
text(`${passed} sikeres · ${failed} hibás · ${total} összesen · ${secs.toFixed(1)} mp`, M + 6, 10, { color: INK });
y = 70;
y += text(
  "A tesztek a gépen, memóriában futnak: hamis adatbázist és hamis levélküldőt használnak, így a Supabase-hez nem nyúlnak és valódi emailt nem küldenek. A felület (gombok, űrlapok) és az adatbázisban futó szabályok külön nincsenek itt tesztelve.",
  M,
  9,
  { color: MUTED, width: W - 2 * M },
);
y += 6;

const files = [...results.testResults].sort((a, b) => Object.keys(ABOUT).indexOf(path.basename(a.name)) - Object.keys(ABOUT).indexOf(path.basename(b.name)));
for (const f of files) {
  const base = path.basename(f.name);
  const [title, about] = ABOUT[base] ?? [base, ""];
  const tests = f.assertionResults;
  const fileOk = tests.every((t) => t.status === "passed") && f.status === "passed";

  ensure(24);
  doc.setFillColor(...GOLD);
  doc.rect(M, y - 4.5, 1.4, 6, "F");
  text(title, M + 4, 12.5, { bold: true, color: NAVY });
  const label = `${tests.filter((t) => t.status === "passed").length}/${tests.length}`;
  text(label, W - M - doc.getTextWidth(label), 10, { bold: true, color: fileOk ? OK : BAD });
  y += 5.5;
  if (about) y += text(about, M + 4, 8.8, { color: MUTED, width: W - 2 * M - 4 }) + 2;
  if (f.status !== "passed" && !tests.length) {
    y += text(`A fájl nem futott le: ${f.message ?? ""}`, M + 4, 9, { color: BAD, width: W - 2 * M - 4 });
  }

  // A group heading shared by every test in the file only repeats the section title, so it is dropped.
  const groups = new Set(tests.map((t) => t.ancestorTitles.join(" › ")));
  for (const t of tests) {
    const ok = t.status === "passed";
    const name = [...(groups.size > 1 ? t.ancestorTitles : []), t.title].join(" › ");
    const lines = doc.splitTextToSize(name, W - 2 * M - 22);
    ensure(lines.length * 4.2 + 3);
    doc.setFillColor(...(ok ? OK : BAD));
    doc.roundedRect(M + 4, y - 3.2, 11, 4.4, 1, 1, "F");
    doc.setFont("Inter", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(ok ? "OK" : "HIBA", M + 9.5, y, { align: "center" });
    y += text(name, M + 18, 9, { color: INK, width: W - 2 * M - 22 }) + 1.4;
    if (!ok) {
      const msg = (t.failureMessages?.[0] ?? "").split("\n").filter((l) => !/^\s*at /.test(l)).slice(0, 3).join("\n");
      ensure(14);
      y += text(msg, M + 18, 7.5, { color: BAD, width: W - 2 * M - 22 }) + 2;
    }
  }
  y += 5;
}

const pages = doc.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  doc.setPage(i);
  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${i} / ${pages}`, W - M, 290, { align: "right" });
}

writeFileSync(PDF_FILE, Buffer.from(doc.output("arraybuffer")));
console.log(`\nTeszt-riport: ${PDF_FILE}`);
process.exit(run.status ?? 1);
