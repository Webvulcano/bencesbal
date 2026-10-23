import { parseOpeningTime } from "@/lib/registration-open";

// Opening time for the static teaser's countdown (public/elozetes/index.html).
// Lives under /elozetes so the proxy lets it through while registration is closed.
export function GET() {
  const opensAt = parseOpeningTime(process.env.JELENTKEZES_NYITAS);
  return Response.json({ opensAt: opensAt === null ? null : new Date(opensAt).toISOString() });
}
