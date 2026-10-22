import { EVENT } from "@/lib/constants";

export const huf = (n) => new Intl.NumberFormat("hu-HU").format(n) + " Ft";
export const day = (d) => d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Budapest" });
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Matches gyoribencesbal.hu / the jelentkezés form (.bal theme): gold on cream, Playfair headline, Inter body.
export const NAVY = "#b5952f"; // bal-gold-dark — accent/links (kept name so the template files don't need touching)
export const GOLD = "#d4af37"; // bal-gold
export const GOLD_SOFT = "#faf8f2"; // bal-subtle
export const MUTED = "#6b6b6b";
const INK = "#222222"; // bal-ink
const BORDER = "#e5d9c2"; // bal-border
const PAGE_BG = "#fcfbf8"; // bal-bg
const SERIF = "Georgia,'Times New Roman',serif"; // email-safe stand-in for Playfair Display
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif"; // stand-in for Inter

// Shared shell: white header with gold rule (like the site header), cream page, white card, Inter-style body.
export function emailShell(subject, body) {
  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:${SANS};color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
  <tr><td style="background:#ffffff;border-bottom:3px solid ${NAVY};padding:22px 24px;text-align:center">
    <div style="font-family:${SERIF};font-weight:bold;color:${NAVY};font-size:24px;line-height:1.2">${esc(EVENT.name)}</div>
    <div style="color:${MUTED};font-size:14px;margin-top:4px">${esc(EVENT.date)}</div>
  </td></tr>
  <tr><td style="padding:24px;font-size:15px;line-height:1.55">
${body}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
