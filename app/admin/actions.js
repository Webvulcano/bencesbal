"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function run(fn, ref) {
  const { error } = await supabaseAdmin.rpc(fn, { p_ref: ref });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function markPaid(formData) {
  await run("mark_paid", formData.get("ref"));
}

export async function cancelRegistration(formData) {
  await run("cancel_registration", formData.get("ref"));
}

export async function setPrinted(refs, printed) {
  const { error } = await supabaseAdmin.rpc("set_printed", { p_refs: refs, p_printed: printed });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/postazas");
}
