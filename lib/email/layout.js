import { EVENT } from "@/lib/constants";

export const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
export const day = (d) => d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Budapest" });
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const NAVY = "#112250";
export const GOLD = "#CDAC43";
export const GOLD_SOFT = "#faf3dc";
export const MUTED = "#6b6b6b";

// Shared shell: navy header with gold rule, white card, body in a sans font for email clients.
export function emailShell(subject, body) {
  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
  <tr><td style="background:${NAVY};border-bottom:4px solid ${GOLD};padding:22px 24px;text-align:center">
    <div style="color:${GOLD};font-size:24px;line-height:1.2">${esc(EVENT.name)}</div>
    <div style="color:#ffffff;font-size:14px;margin-top:4px">${esc(EVENT.date)}</div>
  </td></tr>
  <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55">
${body}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
