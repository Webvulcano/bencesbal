"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendParticipantTickets, sendRegistrationEmail } from "@/lib/email/send";
import { renderCancellation } from "@/lib/email/cancellation";
import { renderPayment } from "@/lib/email/payment";
import { renderTicket } from "@/lib/email/ticket";

async function run(fn, ref) {
  const { error } = await getSupabaseAdmin().rpc(fn, { p_ref: ref });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function markPaid(formData) {
  await requireAdmin();
  const ref = formData.get("ref");
  const { data: before } = await getSupabaseAdmin().from("registrations").select("status").eq("ref", ref).single();
  await run("mark_paid", ref);
  // Only on the pending → paid transition, so a double click does not email twice.
  if (before?.status === "pending") after(() => sendPaidEmails(ref));
}

async function sendPaidEmails(ref) {
  await sendRegistrationEmail(ref, renderPayment, "payment_email");
  await sendParticipantTickets(ref, renderTicket);
}

export async function cancelRegistration(formData) {
  await requireAdmin();
  const ref = formData.get("ref");
  const { data: before } = await getSupabaseAdmin().from("registrations").select("status").eq("ref", ref).single();
  await run("cancel_registration", ref);
  // Pending and paid alike get the notice; skipping already-cancelled ones keeps a double click from emailing twice.
  if (before && before.status !== "cancelled") after(() => sendRegistrationEmail(ref, renderCancellation, "cancellation_email"));
}

const GUEST_ERRORS = {
  INVALID_CONTACT: "A kapcsolattartó neve kötelező.",
  EMAIL_REQUIRED: "A kapcsolattartó email-címe kötelező.",
  INVALID_EMAIL: "Hibás email-cím.",
  ADDRESS_REQUIRED: "Papírjegyhez a teljes cím kötelező.",
  INVALID_QTY: "Kérjük, válasszon legalább 1 jegyet.",
  INVALID_COMPANION: "Minden résztvevő neve kötelező.",
};

export async function createGuest(payload) {
  await requireAdmin();
  const { data, error } = await getSupabaseAdmin().rpc("admin_create_registration", { payload });
  if (error) {
    const [code, arg] = error.message.split(":");
    if (code === "SOLD_OUT") return { error: `Nincs elég szabad hely (${arg === "disz" ? "Díszterem" : "Különterem"}).` };
    if (code === "BAD_FRIEND_CODE") return { error: `A(z) ${arg} barátkód nem létezik.` };
    return { error: GUEST_ERRORS[code] ?? "Nem sikerült menteni." };
  }
  revalidatePath("/admin", "layout");
  if (payload.markPaid) after(() => sendPaidEmails(data));
  return { ref: data };
}

export async function setPrinted(refs, printed) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin().rpc("set_printed", { p_refs: refs, p_printed: printed });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/postazas");
}

export async function setCapacity(_prev, formData) {
  await requireAdmin();
  const hallId = formData.get("hall");
  const capacity = Number(formData.get("capacity"));
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 2000) return { error: "Kérjük, adjon meg egy egész számot (0–2000)." };

  const db = getSupabaseAdmin();
  const { count, error: countError } = await db
    .from("tickets")
    .select("id, registrations!inner(status)", { count: "exact", head: true })
    .eq("hall_id", hallId)
    .neq("registrations.status", "cancelled");
  if (countError) return { error: "Nem sikerült menteni." };
  if (capacity < count) return { error: `Nem lehet kevesebb, mint a már foglalt ${count} hely.` };

  const { error } = await db.from("halls").update({ capacity }).eq("id", hallId);
  if (error) return { error: "Nem sikerült menteni." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
