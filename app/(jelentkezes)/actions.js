"use server";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendRegistrationEmail } from "@/lib/email/send";
import { renderConfirmation } from "@/lib/email/confirmation";
import { isRegistrationOpen } from "@/lib/registration-open";

export async function submitRegistration(payload) {
  // Second line of defence behind proxy.js.
  if (!isRegistrationOpen()) return { error: "REGISTRATION_CLOSED" };

  const { data: ref, error } = await getSupabaseAdmin().rpc("create_registration", { payload });
  if (error) return { error: error.message || "UNKNOWN" };

  // The registration is committed; a failed email must not fail it, only get recorded.
  after(() => sendRegistrationEmail(ref, renderConfirmation, "confirmation"));
  return { ref };
}
