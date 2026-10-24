import "server-only";

// Reads Vercel Web Analytics through the REST query API (needs VERCEL_TOKEN).
const API = "https://api.vercel.com/v1/query/web-analytics";
const PROJECT_ID = process.env.VERCEL_ANALYTICS_PROJECT_ID ?? "prj_gkhwrmO0N3hObDbp6PFAkxY7Xxys";
const TEAM_ID = process.env.VERCEL_ANALYTICS_TEAM_ID ?? "team_3e4PonEWGDktxZ3jN5cVjuN8";

export const ANALYTICS_ERRORS = {
  NO_TOKEN: "A VERCEL_TOKEN nincs beállítva, ezért a látogatói adatok nem tölthetők be.",
  BAD_TOKEN: "A VERCEL_TOKEN érvénytelen vagy lejárt.",
  NOT_ENABLED: "A Web Analytics nincs bekapcsolva a Vercel projektben (vagy még nincs adat).",
  API: "A Vercel Analytics most nem érhető el, kérjük, próbálja később.",
};

async function query(params) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("NO_TOKEN");
  const url = new URL(`${API}/visits/aggregate`);
  for (const [k, v] of Object.entries({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params })) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Vercel Analytics ${res.status} (${params.by}): ${body.slice(0, 300)}`);
    const code = res.status === 401 || res.status === 403 ? "BAD_TOKEN" : res.status === 404 ? "NOT_ENABLED" : "API";
    throw Object.assign(new Error(code), { status: res.status });
  }
  return (await res.json()).data ?? [];
}

// { daily, total, referrers, pages, devices, countries } or { error, status } (error: a key of ANALYTICS_ERRORS).
export async function loadVisitorStats({ since, until }) {
  const range = { since, until };
  try {
    const [daily, total, referrers, pages, devices, countries] = await Promise.all([
      query({ ...range, by: "day" }),
      // Production is the only environment counted, so this is one row with the period's totals.
      query({ ...range, by: "environment" }),
      query({ ...range, by: "referrerHostname", limit: 8 }),
      query({ ...range, by: "requestPath", limit: 8 }),
      query({ ...range, by: "deviceType", limit: 5 }),
      query({ ...range, by: "country", limit: 8 }),
      // No utmSource: UTM dimensions need Web Analytics Plus (402 on Pro).
    ]);
    const sum = (k) => total.reduce((a, r) => a + (r[k] ?? 0), 0);
    return { daily, total: { visitors: sum("visitors"), pageviews: sum("pageviews") }, referrers, pages, devices, countries };
  } catch (e) {
    return { error: ANALYTICS_ERRORS[e.message] ? e.message : "API", status: e.status };
  }
}
