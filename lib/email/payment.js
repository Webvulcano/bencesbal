import { BANK, EVENT } from "@/lib/constants";
import { emailShell, esc, MUTED, NAVY } from "@/lib/email/layout";
import { buildTicketsPdf } from "@/lib/pdf/ticket";

const forint = (n) => new Intl.NumberFormat("hu-HU").format(n) + " forint";

// Sent when the admin marks a registration paid, with the e-tickets attached. Text is the client's template.
export function renderPayment(reg) {
  const subject = `Megérkezett az utalása — ${EVENT.name} (${reg.ref})`;
  const signoff = [
    `A ${EVENT.meetDay} találkozásig`,
    "Önt és Kedves Családját",
    "tisztelettel és barátsággal köszöntik",
    `a szervező győri bencés öregdiákok és a ${BANK.beneficiary}`,
  ];

  const text = [
    "Kedves Barátunk!",
    "",
    `A ${EVENT.name}ba igényelt belépőjegyek ára`,
    forint(reg.total) + ",",
    `megérkezett a ${BANK.beneficiary} számlájára.`,
    "",
    "A belépőjegyeket ímélben és postai úton is kiküldjük Önnek.",
    "Elektronikus belépőjegyeiket a mellékelt PDF-ben találják.",
    "",
    "A részletes programot a bál előtt két héttel ímélben küldjük meg minden résztvevőnek.",
    "",
    ...signoff,
    "",
    `Kérdés esetén: ${EVENT.email}`,
  ].join("\n");

  const body = `
    <p style="margin:0 0 14px">Kedves Barátunk!</p>
    <p style="margin:0 0 14px">A ${esc(EVENT.name)}ba igényelt belépőjegyek ára<br><b style="font-size:18px;color:${NAVY}">${forint(reg.total)}</b>,<br>megérkezett a ${esc(BANK.beneficiary)} számlájára.</p>
    <p style="margin:0 0 14px">A belépőjegyeket ímélben és postai úton is kiküldjük Önnek.<br><b>Elektronikus belépőjegyeiket a mellékelt PDF-ben találják.</b></p>
    <p style="margin:0 0 14px">A részletes programot a bál előtt két héttel ímélben küldjük meg minden résztvevőnek.</p>
    <p style="margin:22px 0 0"><i>${signoff.map(esc).join("<br>")}</i></p>
    <p style="margin:18px 0 0;font-size:13px;color:${MUTED}">Kérdés esetén: <a href="mailto:${esc(EVENT.email)}" style="color:${NAVY}">${esc(EVENT.email)}</a></p>`;

  const attachments = [{ filename: `Belepojegy-${reg.ref}.pdf`, content: buildTicketsPdf(reg), contentType: "application/pdf" }];
  return { subject, html: emailShell(subject, body), text, attachments };
}
