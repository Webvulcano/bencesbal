import { NextResponse } from "next/server";
import { isAdminClaims } from "@/lib/admin-access";
import { LOGIN_PATH } from "@/lib/admin-auth";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Google → Supabase → here with ?code: swap it for a session cookie, then keep it only for allowed emails.
export async function GET(request) {
  const back = (path) => NextResponse.redirect(new URL(path, request.url));
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return back(`${LOGIN_PATH}?hiba=sikertelen`);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back(`${LOGIN_PATH}?hiba=sikertelen`);

  const { data } = await supabase.auth.getClaims();
  if (!isAdminClaims(data?.claims)) {
    await supabase.auth.signOut();
    return back(`${LOGIN_PATH}?hiba=jogosultsag`);
  }
  return back("/admin");
}
