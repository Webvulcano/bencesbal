// Registration is open when JELENTKEZES_NYITVA is "true" (manual switch), or once
// JELENTKEZES_NYITAS (ISO time with offset, e.g. 2026-11-01T10:00:00+01:00) has passed.
// Anything else is closed. Changing either on Vercel needs a redeploy; the time check itself does not.
export function isRegistrationOpen(env = process.env, now = Date.now()) {
  if (env.JELENTKEZES_NYITVA === "true") return true;
  const opensAt = parseOpeningTime(env.JELENTKEZES_NYITAS);
  return opensAt !== null && now >= opensAt;
}

// Without an explicit offset the time would be read in the server's zone (UTC on Vercel),
// so such a value is rejected and registration stays closed.
export function parseOpeningTime(value) {
  const s = value?.trim();
  if (!s || !/(Z|[+-]\d\d:\d\d)$/.test(s)) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}
