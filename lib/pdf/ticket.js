import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { EVENT, HALLS, ticketType } from "@/lib/constants";
import { ACCENT, CREAM, GOLD, INK, MUTED, registerFonts } from "@/lib/pdf/fonts";

const dance = readFileSync(path.join(process.cwd(), "public", "images", "dance.jpg")).toString("base64");

// A5 landscape, one page per participant: main part on the left, tear-off stub with the ticket number on the right.
const W = 210;
const H = 148;
const STUB = 156; // x of the perforation
const ticketNo = (n) => (n ? String(n).padStart(4, "0") : "—");

function ticketPage(doc, reg, t) {
  const type = ticketType(t.ticket_type_id);
  const hall = HALLS[t.hall_id];

  // cream band + gold rule, like the site header
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 34, W, 1.4, "F");

  doc.setTextColor(...ACCENT);
  doc.setFont("Playfair", "bold");
  doc.setFontSize(22);
  doc.text(EVENT.name, 14, 17);
  doc.setFont("Inter", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.setCharSpace(1.6);
  doc.text("BELÉPŐJEGY", 14, 26);
  doc.setCharSpace(0);
  doc.setFont("Inter", "normal");
  doc.setTextColor(...MUTED);
  doc.text(EVENT.date, STUB - 8, 26, { align: "right" });

  // participant
  const label = (k, x, y) => {
    doc.setFont("Inter", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.6);
    doc.text(k.toUpperCase(), x, y);
    doc.setCharSpace(0);
  };
  label("Név", 14, 48);
  doc.setFont("Playfair", "bold");
  doc.setTextColor(...ACCENT);
  let size = 24;
  doc.setFontSize(size);
  while (size > 12 && doc.getTextWidth(t.holder_name) > STUB - 24) doc.setFontSize((size -= 1)); // shrink long names to fit
  doc.text(t.holder_name, 14, 58);

  label("Jegytípus", 14, 72);
  label("Terem", 100, 72);
  doc.setFont("Inter", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(type?.label ?? t.ticket_type_id, 80), 14, 78);
  doc.text(hall?.label ?? t.hall_id, 100, 78);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(14, 90, STUB - 8, 90);

  // practical info, same wording as the postal letter
  doc.setFont("Inter", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40);
  const info =
    `Kapunyitás: ${EVENT.doors} · ${EVENT.venue}, ${EVENT.venueAddress}\n` +
    `Kérjük, hogy az érkezést ne 18 órára, a bál ünnepélyes megnyitójára tervezzék, hanem 17 órára, a kapunyitásra!\n` +
    `Belépéskor névsor alapján is azonosítunk, így a jegyet nem kötelező kinyomtatni, és elvesztése esetén sem kell aggódni.`;
  doc.text(doc.splitTextToSize(info, STUB - 22), 14, 97, { lineHeightFactor: 1.45 });

  doc.setFont("Playfair", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...ACCENT);
  doc.text("Szeretettel várjuk!", 14, 134);

  // perforation
  doc.setDrawColor(170);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(STUB, 35.4, STUB, H);
  doc.setLineDashPattern([], 0);

  // stub
  const cx = STUB + (W - STUB) / 2;
  doc.setFont("Inter", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("JEGY SORSZÁMA", cx, 48, { align: "center" });
  doc.setFont("Playfair", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...ACCENT);
  doc.text(ticketNo(t.ticket_no), cx, 61, { align: "center" });

  doc.setFillColor(...ACCENT);
  doc.roundedRect(cx - 9, 68, 18, 14, 3, 3, "F");
  doc.setFont("Inter", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(hall?.short ?? "", cx, 77.8, { align: "center" });
  doc.setFont("Inter", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(hall?.label ?? "", cx, 88, { align: "center" });
  doc.text(reg.ref, cx, 94, { align: "center" });

  doc.addImage(dance, "JPEG", STUB + 8, 104, W - STUB - 16, (W - STUB - 16) * 0.75, undefined, "FAST");

  // footer
  doc.setFont("Inter", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`${EVENT.shortName} · ${EVENT.email}`, 14, H - 6);
}

// reg: registrations row with tickets(*); call after mark_paid so ticket_no is set.
export function buildTicketsPdf(reg) {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape" });
  registerFonts(doc);
  doc.setProperties({ title: `Belépőjegy — ${EVENT.name} (${reg.ref})` });
  [...reg.tickets]
    .sort((a, b) => a.seq - b.seq)
    .forEach((t, i) => {
      if (i > 0) doc.addPage();
      ticketPage(doc, reg, t);
    });
  return Buffer.from(doc.output("arraybuffer"));
}
