import "server-only";
import { dateSlices } from "@/lib/stats";

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

// { daily, total, devices, countries } or { error, status } (error: a key of ANALYTICS_ERRORS).
// from: exact start (ISO). When it is not midnight UTC (the opening day), that first day is counted by the hour from
// `from` on, so visits before the opening stay out; the other queries take `from` as is.
async function dailyVisits(dates, from) {
  const daily = (await Promise.all(dateSlices(dates).map((s) => query({ ...s, by: "day" })))).flat();
  if (from.slice(11) === "00:00:00.000Z") return daily;
  const hours = await query({ since: from, until: `${dates[0]}T23:59:59Z`, by: "hour" });
  const first = { timestamp: `${dates[0]}T00:00:00.000Z`, visitors: 0, pageviews: 0 };
  for (const h of hours) {
    first.visitors += h.visitors ?? 0;
    first.pageviews += h.pageviews ?? 0;
  }
  return [first, ...daily.filter((r) => String(r.timestamp).slice(0, 10) !== dates[0])];
}

export async function loadVisitorStats({ until, dates, from }) {
  // Exact end of the last day: without a time Vercel reads a bare date as 01:00 UTC for non-day queries.
  const range = { since: from, until: `${until}T23:59:59Z` };
  // Before the opening there is nothing to show yet (and Vercel would get a start time in the future).
  if (Date.parse(from) > Date.now()) return { daily: [], total: { visitors: 0, pageviews: 0 }, devices: [], countries: [] };
  try {
    const [daily, total, devices, countries] = await Promise.all([
      dailyVisits(dates, from),
      // Production is the only environment counted, so this is one row with the period's totals.
      query({ ...range, by: "environment" }),
      query({ ...range, by: "deviceType", limit: 5 }),
      query({ ...range, by: "country", limit: 8 }),
      // No utmSource: UTM dimensions need Web Analytics Plus (402 on Pro).
    ]);
    const sum = (k) => total.reduce((a, r) => a + (r[k] ?? 0), 0);
    return { daily, total: { visitors: sum("visitors"), pageviews: sum("pageviews") }, devices, countries };
  } catch (e) {
    return { error: ANALYTICS_ERRORS[e.message] ? e.message : "API", status: e.status };
  }
}
