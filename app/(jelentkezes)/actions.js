"use server";
import { after } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendRegistrationEmail } from "@/lib/email/send";
import { renderConfirmation } from "@/lib/email/confirmation";

export async function submitRegistration(payload) {
  const { data: ref, error } = await supabase.rpc("create_registration", { payload });
  if (error) return { error: error.message || "UNKNOWN" };

  // The registration is committed; a failed email must not fail it, only get recorded.
  after(() => sendRegistrationEmail(ref, renderConfirmation, "confirmation"));
  return { ref };
}
