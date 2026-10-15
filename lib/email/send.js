import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendMail } from "@/lib/mailer";
import { splitTickets } from "@/lib/email/recipients";

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

// After payment: every participant with their own address gets their own ticket(s), one email per address. The
// contact's share went with the payment email (see splitTickets). Outcome is recorded per ticket. Never throws.
export async function sendParticipantTickets(ref, render) {
  const db = getSupabaseAdmin();
  const { data: reg, error } = await db.from("registrations").select("*, tickets(*)").eq("ref", ref).single();
  if (error) return console.error(`ticket emails: could not load ${ref}:`, error.message);

  for (const [email, all] of splitTickets(reg).byEmail) {
    const tickets = all.filter((t) => !t.ticket_email_sent_at);
    if (!tickets.length) continue;
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
