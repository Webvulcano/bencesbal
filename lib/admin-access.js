// Who counts as admin, decided from the Supabase session's JWT claims.
// Pure (no Next/Supabase imports): shared by proxy.js, lib/admin-auth.js and the tests.

export function adminEmails(list = process.env.ADMIN_EMAILS) {
  return (list ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Signed in with Google (OAuth), not e.g. an email+password signup that only claims the address.
const viaOAuth = (amr) => Array.isArray(amr) && amr.some((m) => (typeof m === "string" ? m : m?.method) === "oauth");

export function isAdminClaims(claims, list = process.env.ADMIN_EMAILS) {
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : "";
  return email !== "" && viaOAuth(claims.amr) && adminEmails(list).includes(email);
}
