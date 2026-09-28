"use server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function run(fn, ref) {
  const { error } = await getSupabaseAdmin().rpc(fn, { p_ref: ref });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function markPaid(formData) {
  await run("mark_paid", formData.get("ref"));
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
