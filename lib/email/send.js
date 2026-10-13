import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendMail } from "@/lib/mailer";

// Loads the registration, emails the contact person and records the outcome in <column>_sent_at / <column>_error.
// Never throws: callers run it in after(), and the registration / payment is already committed.
export async function sendRegistrationEmail(ref, render, column) {
  const db = getSupabaseAdmin();
  try {
    const { data: reg, error } = await db.from("registrations").select("*, tickets(*)").eq("ref", ref).single();
    if (error) throw new Error(error.message);
    await sendMail({ to: reg.contact_email, ...render(reg) });
    await db.from("registrations").update({ [`${column}_sent_at`]: new Date().toISOString(), [`${column}_error`]: null }).eq("ref", ref);
  } catch (e) {
    console.error(`${column} email failed for ${ref}:`, e);
    await db.from("registrations").update({ [`${column}_error`]: String(e?.message ?? e).slice(0, 500) }).eq("ref", ref);
  }
}

// After payment: every participant with their own address gets their own ticket(s). The contact person is skipped,
// they already got all tickets with the payment email. Outcome is recorded per ticket. Never throws.
export async function sendParticipantTickets(ref, render) {
  const db = getSupabaseAdmin();
  const { data: reg, error } = await db.from("registrations").select("*, tickets(*)").eq("ref", ref).single();
  if (error) return console.error(`ticket emails: could not load ${ref}:`, error.message);

  const contact = (reg.contact_email ?? "").toLowerCase();
  const byEmail = new Map();
  for (const t of [...reg.tickets].sort((a, b) => a.seq - b.seq)) {
    const email = (t.holder_email ?? "").trim().toLowerCase();
    if (!email || email === contact || t.ticket_email_sent_at) continue;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(t);
  }

  for (const [email, tickets] of byEmail) {
    const ids = tickets.map((t) => t.id);
    try {
      await sendMail({ to: email, ...render(reg, tickets) });
      await db.from("tickets").update({ ticket_email_sent_at: new Date().toISOString(), ticket_email_error: null }).in("id", ids);
    } catch (e) {
      console.error(`ticket email failed for ${ref} → ${email}:`, e);
      await db.from("tickets").update({ ticket_email_error: String(e?.message ?? e).slice(0, 500) }).in("id", ids);
    }
  }
}
