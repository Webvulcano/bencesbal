// Registration is closed unless JELENTKEZES_NYITVA is explicitly "true".
// Changing it on Vercel needs a redeploy.
export function isRegistrationOpen() {
  return process.env.JELENTKEZES_NYITVA === "true";
}
