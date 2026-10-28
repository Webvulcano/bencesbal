// One-off: resend the emails that went from the noreply mailbox to non-Gmail addresses before the Gmail fallback
// (Hotmail/Outlook dropped them). Each address gets the email matching its registration's current status, with a
// "resent" notice on top. Dry run by default; --send actually sends. Does not touch *_sent_at columns.
//
//   node --env-file=.env.local --env-file=.env.cloud.local node_modules/.bin/vite-node --config vitest.config.mjs scripts/ujrakuldes.mjs
//   (append -- --send to actually send)
//
// Env: .env.local gives GMAIL_*, .env.cloud.local (loaded last, wins) the production Supabase.
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { pickSender, sendMail } from "@/lib/mailer";
import { renderConfirmation } from "@/lib/email/confirmation";
import { renderPayment } from "@/lib/email/payment";
import { renderTicket } from "@/lib/email/ticket";
import { normEmail, splitTickets } from "@/lib/email/recipients";
import { esc, GOLD, GOLD_SOFT } from "@/lib/email/layout";

const SEND = process.argv.includes("--send");
const NOTE = "Korábbi levelünk technikai hiba miatt nem minden esetben érkezett meg, ezért újraküldjük. Ha már megkapta, kérjük, tekintse tárgytalannak.";
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);
const nonGmail = (e) => !!normEmail(e) && !GMAIL_DOMAINS.has(normEmail(e).split("@").pop());

const withNote = (m) => ({
  ...m,
  subject: "Újraküldés: " + m.subject,
  html: m.html.replace(
    /(<td style="padding:24px;font-size:15px;line-height:1.55">\n)/,
    `$1    <p style="margin:0 0 18px;background:${GOLD_SOFT};border-left:4px solid ${GOLD};padding:10px 14px;font-size:14px">${esc(NOTE)}</p>\n`,
  ),
  text: NOTE + "\n\n" + m.text,
});

const db = getSupabaseAdmin();
console.log(`DB: ${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host}  |  mód: ${SEND ? "KÜLDÉS" : "dry-run (nem küld)"}\n`);

const { data: regs, error } = await db.from("registrations").select("*, tickets(*)").in("status", ["pending", "paid"]).order("created_at");
if (error) throw new Error(error.message);

const jobs = [];
for (const reg of regs) {
  if (reg.status === "pending" && nonGmail(reg.contact_email) && reg.confirmation_sent_at)
    jobs.push({ kind: "visszaigazoló", ref: reg.ref, to: reg.contact_email, mail: renderConfirmation(reg), tickets: 0 });

  if (reg.status !== "paid") continue;
  const split = splitTickets(reg);
  if (nonGmail(reg.contact_email) && reg.payment_email_sent_at)
    jobs.push({ kind: "fizetési", ref: reg.ref, to: reg.contact_email, mail: renderPayment(reg), tickets: split.contact.length });
  for (const [email, all] of split.byEmail) {
    const sent = all.filter((t) => t.ticket_email_sent_at);
    if (nonGmail(email) && sent.length) jobs.push({ kind: "jegy", ref: reg.ref, to: email, mail: renderTicket(reg, sent), tickets: sent.length });
  }
}

for (const [i, j] of jobs.entries()) {
  const att = j.mail.attachments?.length ? `PDF ${j.tickets} jegy` : "nincs melléklet";
  console.log(`${String(i + 1).padStart(2)}. ${j.ref}  ${j.kind.padEnd(13)} → ${j.to}  (${att}, feladó: ${pickSender(j.to)})`);
}
console.log(`\nÖsszesen: ${jobs.length} levél`);

if (jobs.some((j) => pickSender(j.to) !== "gmail")) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD hiányzik — a levelek a noreply@-ról mennének.");
if (!SEND) process.exit(0);

console.log("\nKüldés…");
let ok = 0;
for (const j of jobs) {
  try {
    await sendMail({ to: j.to, ...withNote(j.mail) });
    ok++;
    console.log(`✓ ${j.ref} ${j.kind} → ${j.to}`);
  } catch (e) {
    console.log(`✗ ${j.ref} ${j.kind} → ${j.to}: ${e?.message ?? e}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
console.log(`\nKész: ${ok}/${jobs.length} elküldve.`);
process.exit(ok === jobs.length ? 0 : 1);
