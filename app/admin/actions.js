"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendParticipantTickets, sendRegistrationEmail } from "@/lib/email/send";
import { renderPayment } from "@/lib/email/payment";
import { renderTicket } from "@/lib/email/ticket";

async function run(fn, ref) {
  const { error } = await getSupabaseAdmin().rpc(fn, { p_ref: ref });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function markPaid(formData) {
  const ref = formData.get("ref");
  const { data: before } = await getSupabaseAdmin().from("registrations").select("status").eq("ref", ref).single();
  await run("mark_paid", ref);
  // Only on the pending → paid transition, so a double click does not email twice.
  if (before?.status === "pending")
    after(async () => {
      await sendRegistrationEmail(ref, renderPayment, "payment_email");
      await sendParticipantTickets(ref, renderTicket);
    });
}

export async function cancelRegistration(formData) {
  await run("cancel_registration", formData.get("ref"));
}

const GUEST_ERRORS = {
  INVALID_CONTACT: "A kapcsolattartó neve kötelező.",
  INVALID_EMAIL: "Hibás email-cím.",
  ADDRESS_REQUIRED: "Papírjegyhez a teljes cím kötelező.",
  INVALID_QTY: "Válassz legalább 1 jegyet.",
  INVALID_COMPANION: "Minden résztvevő neve kötelező.",
};

export async function createGuest(payload) {
  const { data, error } = await getSupabaseAdmin().rpc("admin_create_registration", { payload });
  if (error) {
    const [code, arg] = error.message.split(":");
    if (code === "SOLD_OUT") return { error: `Nincs elég szabad hely (${arg === "disz" ? "Díszterem" : "Különterem"}).` };
    if (code === "BAD_FRIEND_CODE") return { error: `A(z) ${arg} barátkód nem létezik.` };
    return { error: GUEST_ERRORS[code] ?? "Nem sikerült menteni." };
  }
  revalidatePath("/admin", "layout");
  return { ref: data };
}

export async function setPrinted(refs, printed) {
  const { error } = await getSupabaseAdmin().rpc("set_printed", { p_refs: refs, p_printed: printed });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/postazas");
}

export async function setCapacity(_prev, formData) {
  const hallId = formData.get("hall");
  const capacity = Number(formData.get("capacity"));
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 2000) return { error: "Adj meg egy egész számot (0–2000)." };

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
