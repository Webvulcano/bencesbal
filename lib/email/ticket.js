import { EVENT } from "@/lib/constants";
import { emailShell, esc, MUTED, NAVY } from "@/lib/email/layout";
import { buildTicketsPdf } from "@/lib/pdf/ticket";

// E-ticket for a participant who is not the contact person; tickets = that person's own tickets only.
export function renderTicket(reg, tickets) {
  const name = tickets[0].holder_name;
  const subject = `Belépőjegy — ${EVENT.name}`;
  const lines = [
    `${reg.contact_name} jelentkezése révén Önt is szeretettel várjuk a ${EVENT.name}on!`,
    `Elektronikus belépőjegyét a mellékelt PDF-ben találja. Belépéskor névsor alapján is azonosítunk, így a jegyet nem kötelező kinyomtatni.`,
    `Kapunyitás: ${EVENT.doors} · ${EVENT.venue}, ${EVENT.venueAddress}`,
    "Kérjük, hogy az érkezést ne 18 órára, a bál ünnepélyes megnyitójára tervezzék, hanem 17 órára, a kapunyitásra!",
    "A részletes programot a bál előtt két héttel ímélben küldjük meg minden résztvevőnek.",
  ];

  const text = [`Kedves ${name}!`, "", ...lines.flatMap((l) => [l, ""]), "Szeretettel várjuk!", "A bál szervezői", "", `Kérdés esetén: ${EVENT.email}`].join("\n");

  const body = `
    <p style="margin:0 0 14px">Kedves ${esc(name)}!</p>
    ${lines.map((l, i) => `<p style="margin:0 0 14px">${i === 1 ? `<b>${esc(l)}</b>` : esc(l)}</p>`).join("\n    ")}
    <p style="margin:22px 0 0"><i>Szeretettel várjuk!<br>A bál szervezői</i></p>
    <p style="margin:18px 0 0;font-size:13px;color:${MUTED}">Kérdés esetén: <a href="mailto:${esc(EVENT.email)}" style="color:${NAVY}">${esc(EVENT.email)}</a></p>`;

  const attachments = [{ filename: `Belepojegy-${reg.ref}.pdf`, content: buildTicketsPdf({ ...reg, tickets }), contentType: "application/pdf" }];
  return { subject, html: emailShell(subject, body), text, attachments };
}
