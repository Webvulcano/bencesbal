import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { ENVELOPE as E, EVENT } from "@/lib/constants";

const NAVY = [17, 34, 80];
const GOLD = [205, 172, 67];
const MUTED = [110, 110, 120];
const INK = [25, 25, 30];

const FONTS = [
  ["Inter_400Regular.ttf", "Inter", "normal"],
  ["Inter_700Bold.ttf", "Inter", "bold"],
  ["PlayfairDisplay_700Bold.ttf", "Playfair", "bold"],
  ["PlayfairDisplay_400Regular_Italic.ttf", "Playfair", "italic"],
];
const fontData = FONTS.map(([file, family, style]) => [
  file,
  family,
  style,
  readFileSync(path.join(process.cwd(), "public", "fonts", file)).toString("base64"),
]);

// Hungarian postal order: name / settlement / street, number / ZIP
const addressLines = (a) => [a.city, `${a.street} ${a.no}${a.floor ? `, ${a.floor}` : ""}`, a.zip];

function coverPage(doc, reg) {
  doc.setDrawColor(170);
  doc.setLineWidth(0.2);
  E.foldMarks.forEach((y) => doc.line(3, y, 8, y));

  doc.setTextColor(...NAVY);
  doc.setFont("Playfair", "bold");
  doc.setFontSize(17);
  doc.text(EVENT.name, 190, 22, { align: "right" });
  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${EVENT.date} · ${EVENT.venue}`, 190, 28, { align: "right" });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(120, 31, 190, 31);

  // faint corner marks show where the envelope window is, for a quick alignment check
  const [l, t, r, b] = [E.windowLeft, E.windowTop, E.windowLeft + E.windowWidth, E.windowTop + E.windowHeight];
  doc.setDrawColor(225);
  doc.setLineWidth(0.2);
  [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    doc.line(cx, cy, cx + 4 * dx, cy);
    doc.line(cx, cy, cx, cy + 4 * dy);
  });

  const x = l + 5;
  let y = t + 7;
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${EVENT.shortName} · ${EVENT.venueAddress}`, x, y);
  doc.setDrawColor(...MUTED);
  doc.line(x, y + 1.2, x + 72, y + 1.2);
  y += 10;
  doc.setTextColor(...INK);
  doc.setFont("Inter", "bold");
  doc.setFontSize(12);
  doc.text(reg.contact.name, x, y);
  doc.setFont("Inter", "normal");
  addressLines(reg.address).forEach((line, i) => doc.text(String(line), x, y + 6 * (i + 1)));

  const side = [
    ["Azonosító", reg.ref],
    ["Jegyek", `${reg.members.length} db`],
    ["Terem", reg.hallLabels.join(", ")],
  ];
  doc.setFontSize(8.5);
  side.forEach(([k, v], i) => {
    doc.setFont("Inter", "normal");
    doc.setTextColor(...MUTED);
    doc.text(k, 20, 58 + i * 7);
    doc.setFont("Inter", "bold");
    doc.setTextColor(...INK);
    doc.text(v, 85, 58 + i * 7, { align: "right" });
  });

  const first = reg.contact.name.split(" ").slice(1).join(" ") || reg.contact.name;
  doc.setFont("Playfair", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(`Kedves ${first}!`, 20, 118);
  doc.setFont("Inter", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(40);
  const body =
    `Örömmel küldjük a ${EVENT.name}ra szóló belépőjegyeiket (${reg.members.length} db). ` +
    `Belépéskor névsor alapján is azonosítunk, így a jegy elvesztése esetén sem kell aggódniuk.\n\n` +
    `Kapunyitás: ${EVENT.doors} · Helyszín: ${EVENT.venue}, ${EVENT.venueAddress}\nÖltözet: ${EVENT.dressCode.toLowerCase()}\n\n` +
    `Szeretettel várjuk Önöket!`;
  doc.text(doc.splitTextToSize(body, 170), 20, 127, { lineHeightFactor: 1.5 });
  doc.setFont("Playfair", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("A bál szervezői", 190, 190, { align: "right" });

  footer(doc);
}

function footer(doc) {
  doc.setFont("Inter", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`${EVENT.shortName} · ${EVENT.venueAddress} · ${EVENT.email}`, 105, 290, { align: "center" });
}

export function buildPostalPdf(registrations) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  for (const [file, family, style, b64] of fontData) {
    doc.addFileToVFS(file, b64);
    doc.addFont(file, family, style);
  }
  doc.setProperties({ title: "Postázás — Győri Bencés Bál" });

  registrations.forEach((reg, i) => {
    if (i > 0) doc.addPage();
    coverPage(doc, reg);
  });
  return doc.output("arraybuffer");
}
