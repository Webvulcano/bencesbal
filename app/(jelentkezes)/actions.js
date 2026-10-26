"use server";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { bccList, sendRegistrationEmail } from "@/lib/email/send";
import { renderConfirmation } from "@/lib/email/confirmation";
import { isRegistrationOpen } from "@/lib/registration-open";

export async function submitRegistration(payload) {
  // Second line of defence behind proxy.js.
  if (!isRegistrationOpen()) return { error: "REGISTRATION_CLOSED" };

  const { data: ref, error } = await getSupabaseAdmin().rpc("create_registration", { payload });
  if (error) return { error: error.message || "UNKNOWN" };

  // The registration is committed; a failed email must not fail it, only get recorded.
  after(() => sendRegistrationEmail(ref, renderConfirmation, "confirmation", { bcc: bccList() }));
  return { ref };
}

// Staff code check for the form (the code itself never reaches the client). The DB checks it again on submit.
export async function checkStaffCode(code) {
  const { data, error } = await getSupabaseAdmin().from("staff_discount").select("percent, max_tickets").eq("code", String(code ?? "").trim()).maybeSingle();
  if (error || !data) return null;
  return { percent: data.percent, maxTickets: data.max_tickets };
}
