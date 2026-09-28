import "server-only";
import { createClient } from "@supabase/supabase-js";

let client;

// Created on first use, not at import: builds (e.g. Vercel) must not need the secret key.
export function getSupabaseAdmin() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
