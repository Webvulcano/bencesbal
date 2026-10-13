import { BANK, bankRows, EVENT, memo, PAYMENT_DEADLINE_DAYS, ticketType } from "@/lib/constants";
import { day, emailShell, esc, GOLD, GOLD_SOFT, huf, MUTED, NAVY } from "@/lib/email/layout";

// Tickets grouped by type, in the order they were entered: "Dísztermi jegy (2 db)" + numbered participants.
function groupTickets(tickets) {
  const groups = new Map();
  for (const t of [...tickets].sort((a, b) => a.seq - b.seq)) {
    const label = ticketType(t.ticket_type_id)?.label ?? t.ticket_type_id;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(t);
  }
  return [...groups].map(([label, list]) => ({ label, list }));
}

// reg: registrations row with tickets(*), straight from Supabase. Text follows the client's template from earlier years.
export function renderConfirmation(reg) {
  const groups = groupTickets(reg.tickets);
  const deadline = new Date(new Date(reg.created_at).getTime() + PAYMENT_DEADLINE_DAYS * 86400000);
  const bank = [...bankRows(), ["Összeg", huf(reg.total)], ["Közlemény", memo(reg.ref)], ["Határidő", day(deadline)]];

  const subject = `Jegyigénylés — ${EVENT.name} (${reg.ref})`;

  let n = 0;
  const text = [
    "Kedves Barátunk!",
    "",
    `Örömmel köszöntjük a ${EVENT.name} résztvevői között!`,
    "",
    "A jegyigénylés adatai:",
    "",
    ...groups.flatMap((g) => [`${g.label} (${g.list.length} db)`, ...g.list.map((t) => `${++n}. résztvevő: ${t.holder_name}, ${t.holder_email}`), ""]),
    `Végösszeg: ${huf(reg.total)}`,
    "",
    `Kérjük, hogy a végösszeget szíveskedjék átutalni a ${BANK.beneficiary} számlájára!`,
    ...bank.map(([k, v]) => `${k}: ${v}`),
    "A közleményt kérjük pontosan így adja meg, ez alapján azonosítjuk az utalást.",
    "",
    `Barátkód: ${reg.ref} — ha barátaival egy asztalhoz szeretne ülni, küldje el nekik ezt a kódot.`,
    "",
    `${EVENT.date}, kapunyitás ${EVENT.doors}`,
    `${EVENT.venue}, ${EVENT.venueAddress}`,
    "",
    "PAX!",
    "Tisztelettel és köszönettel:",
    `A szervezők és a ${BANK.beneficiary}`,
    "",
    `Kérdés esetén: ${EVENT.email}`,
  ].join("\n");

  const row = (k, v) =>
    `<tr><td style="padding:6px 0;color:${MUTED};width:130px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${v}</td></tr>`;

  n = 0;
  const body = `
    <p style="margin:0 0 12px">Kedves Barátunk!</p>
    <p style="margin:0 0 18px">Örömmel köszöntjük a ${esc(EVENT.name)} résztvevői között!</p>

    <p style="margin:0 0 8px;font-weight:bold">A jegyigénylés adatai:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px">
      ${groups
        .map(
          (g) =>
            `<tr><td style="padding:10px 0 4px;font-weight:bold;color:${NAVY}">${esc(g.label)} (${g.list.length} db)</td></tr>` +
            g.list.map((t) => `<tr><td style="padding:3px 0 3px 12px">${++n}. résztvevő: ${esc(t.holder_name)}, <span style="color:${MUTED}">${esc(t.holder_email)}</span></td></tr>`).join(""),
        )
        .join("")}
      <tr><td style="padding:12px 0 0;border-top:1px solid #eee;margin-top:8px;font-weight:bold;font-size:15px">Végösszeg: ${huf(reg.total)}</td></tr>
    </table>

    <p style="margin:0 0 10px">Kérjük, hogy a végösszeget <b>${PAYMENT_DEADLINE_DAYS} napon belül</b> szíveskedjék átutalni a ${esc(BANK.beneficiary)} számlájára!</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${GOLD};border-radius:8px;border-collapse:separate">
      <tr><td style="padding:10px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
          ${bank
            .map(([k, v]) =>
              k === "Közlemény"
                ? row(k, `<span style="font-family:monospace;font-size:15px;background:${GOLD_SOFT};border:1px solid ${GOLD};border-radius:4px;padding:2px 8px">${esc(v)}</span>`)
                : row(k, esc(v)),
            )
            .join("")}
        </table>
        <p style="margin:6px 0 0;color:#b3261e;font-size:13px;font-weight:bold">A közleményt kérjük pontosan így adja meg, ez alapján azonosítjuk az utalást.</p>
      </td></tr>
    </table>

    <p style="margin:20px 0 0;background:${GOLD_SOFT};border:1px solid ${GOLD};border-radius:6px;padding:10px 14px;font-size:14px">
      <b>Barátkód: <span style="font-family:monospace;letter-spacing:1px">${esc(reg.ref)}</span></b><br>
      Ha barátaival egy asztalhoz szeretne ülni, küldje el nekik ezt a kódot.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:${MUTED}">
      ${esc(EVENT.date)}, kapunyitás ${esc(EVENT.doors)}<br>
      ${esc(EVENT.venue)}, ${esc(EVENT.venueAddress)}
    </p>

    <p style="margin:22px 0 0">PAX!<br>Tisztelettel és köszönettel:<br><i>A szervezők és a ${esc(BANK.beneficiary)}</i></p>
    <p style="margin:18px 0 0;font-size:13px;color:${MUTED}">Kérdés esetén: <a href="mailto:${esc(EVENT.email)}" style="color:${NAVY}">${esc(EVENT.email)}</a></p>`;

  return { subject, html: emailShell(subject, body), text };
}

