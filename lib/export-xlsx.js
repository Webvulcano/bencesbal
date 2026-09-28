import "server-only";
import ExcelJS from "exceljs";
import { seatingRequestText, STATUS } from "@/lib/admin-data";

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF112250" } };
const STRIPES = ["FFFFFFFF", "FFFAF5E6"];
const GOLD = { argb: "FFCDAC43" };
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const dt = (s) => (s ? new Date(s).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Budapest" }) : "");

function sheet(wb, name, columns) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns;
  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.fill = HEADER_FILL;
  h.height = 20;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export async function buildXlsx({ registrations }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Győri Bencés Bál — jelentkezés";
  const active = registrations.filter((r) => r.status !== "cancelled");

  // One row per person; a registration's members stay together, linked registrations share a seating group.
  const wp = sheet(wb, "Résztvevők", [
    { header: "Ültetési csoport", key: "group", width: 10 },
    { header: "Jegyszám", key: "no", width: 10 },
    { header: "Név", key: "name", width: 26 },
    { header: "Terem", key: "hall", width: 13 },
    { header: "Jegytípus", key: "type", width: 32 },
    { header: "Társaság", key: "ref", width: 12 },
    { header: "Kapcsolattartó", key: "lead", width: 24 },
    { header: "Fő", key: "size", width: 5 },
    { header: "Ültetési kérés", key: "seat", width: 44 },
    { header: "Vendég típusa", key: "cat", width: 14 },
    { header: "Státusz", key: "status", width: 15 },
    { header: "Email", key: "email", width: 30 },
  ]);
  let prevGroup = null;
  let stripe = -1;
  for (const r of active) {
    if (r.groupNo !== prevGroup) stripe++;
    r.members.forEach((m, i) => {
      const row = wp.addRow({
        group: r.groupNo,
        no: m.ticketNo ?? "",
        name: m.name,
        hall: m.hallLabel,
        type: m.typeLabel,
        ref: r.ref,
        lead: r.contact.name,
        size: r.members.length,
        seat: i === 0 ? seatingRequestText(r) : "",
        cat: r.source === "admin" ? r.guestCategory || "Meghívott" : "",
        status: STATUS[r.status].label,
        email: m.email,
      });
      row.fill = fill(STRIPES[stripe % 2]);
      if (i === 0 && r.groupNo !== prevGroup) row.border = { top: { style: "medium", color: GOLD } };
      else if (i === 0) row.border = { top: { style: "hair", color: GOLD } };
      if (m.isContact) row.getCell("name").font = { bold: true };
    });
    prevGroup = r.groupNo;
  }

  const wg = sheet(wb, "Társaságok", [
    { header: "Ültetési csoport", key: "group", width: 10 },
    { header: "Közlemény / kód", key: "ref", width: 14 },
    { header: "Kapcsolattartó", key: "lead", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Telefon", key: "phone", width: 16 },
    { header: "Fő", key: "size", width: 5 },
    { header: "Tagok", key: "members", width: 60 },
    { header: "Terem", key: "hall", width: 22 },
    { header: "Ültetési kérés", key: "seat", width: 44 },
    { header: "Összeg (Ft)", key: "total", width: 13, style: { numFmt: "#,##0" } },
    { header: "Forrás", key: "source", width: 11 },
    { header: "Vendég típusa", key: "cat", width: 14 },
    { header: "Megjegyzés", key: "note", width: 30 },
    { header: "Státusz", key: "status", width: 15 },
    { header: "Jelentkezett", key: "created", width: 17 },
    { header: "Fizetve", key: "paid", width: 17 },
  ]);
  for (const r of registrations) {
    wg.addRow({
      group: r.groupNo ?? "",
      ref: r.ref,
      lead: r.contact.name,
      email: r.contact.email,
      phone: r.contact.phone,
      size: r.members.length,
      members: r.members.map((m) => m.name).join(", "),
      hall: r.hallLabels.join(", "),
      seat: seatingRequestText(r),
      total: r.total,
      source: r.source === "admin" ? "meghívott" : "web",
      cat: r.guestCategory ?? "",
      note: r.note ?? "",
      status: STATUS[r.status].label,
      created: dt(r.createdAt),
      paid: dt(r.paidAt),
    });
  }

  const wpost = sheet(wb, "Postázás", [
    { header: "Közlemény / kód", key: "ref", width: 14 },
    { header: "Címzett", key: "name", width: 26 },
    { header: "Irányítószám", key: "zip", width: 12 },
    { header: "Település", key: "city", width: 18 },
    { header: "Cím", key: "street", width: 36 },
    { header: "Jegyek száma", key: "n", width: 12 },
    { header: "Jegyszámok", key: "nos", width: 20 },
  ]);
  for (const r of registrations.filter((x) => x.status === "paid" && x.paperTicket)) {
    wpost.addRow({
      ref: r.ref,
      name: r.contact.name,
      zip: r.address.zip,
      city: r.address.city,
      street: `${r.address.street} ${r.address.no}${r.address.floor ? ", " + r.address.floor : ""}`,
      n: r.members.length,
      nos: r.members.map((m) => m.ticketNo).join(", "),
    });
  }

  return wb.xlsx.writeBuffer();
}
