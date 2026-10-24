import { EVENT } from "@/lib/constants";
import { emailShell, esc, MUTED, NAVY } from "@/lib/email/layout";

// Sent when the admin cancels a registration (pending or paid). Text is the client's template.
export function renderCancellation(reg) {
  const subject = `Jelentkezés törölve — ${EVENT.name} (${reg.ref})`;
  const line = `Tisztelettel jelezzük, hogy a ${EVENT.name}ba leadott jelentkezése a mai napon törlésre került.`;
  const help = "Amennyiben ez tévedés, vagy kérdése van, kérjük, keressen minket bizalommal az alábbi címen.";

  const text = [`Kedves ${reg.contact_name}!`, "", line, help, "", "Tisztelettel,", "A bál szervezői", "", `Kérdés esetén: ${EVENT.email}`].join("\n");

  const body = `
    <p style="margin:0 0 14px">Kedves ${esc(reg.contact_name)}!</p>
    <p style="margin:0 0 14px">${esc(line)}<br>${esc(help)}</p>
    <p style="margin:22px 0 0">Tisztelettel,<br><i>A bál szervezői</i></p>
    <p style="margin:18px 0 0;font-size:13px;color:${MUTED}">Kérdés esetén: <a href="mailto:${esc(EVENT.email)}" style="color:${NAVY}">${esc(EVENT.email)}</a></p>`;

  return { subject, html: emailShell(subject, body), text };
}
