import "server-only";
import { redirect } from "next/navigation";
import { isAdminClaims } from "@/lib/admin-access";
import { createSupabaseServer } from "@/lib/supabase-server";

export const LOGIN_PATH = "/admin/belepes";

// The verified claims of an allowed admin, or null.
export async function getAdmin() {
  const { data } = await (await createSupabaseServer()).auth.getClaims();
  return isAdminClaims(data?.claims) ? data.claims : null;
}

export async function isAdmin() {
  return (await getAdmin()) !== null;
}

// Call at the top of every admin page, server action and data loader.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect(LOGIN_PATH);
}
