"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/admin-auth";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function loginWithGoogle() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const { data, error } = await (await createSupabaseServer()).auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/admin/auth/callback` },
  });
  if (error || !data?.url) redirect(`${LOGIN_PATH}?hiba=sikertelen`);
  redirect(data.url);
}

export async function logout() {
  await (await createSupabaseServer()).auth.signOut();
  redirect(LOGIN_PATH);
}
