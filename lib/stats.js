// Pure helpers for the admin statistics page (no I/O, unit-tested).
// Days are UTC calendar days, the same buckets Vercel Analytics uses for `by=day`.

export const PERIODS = [7, 28, 90];

const day = (d) => d.toISOString().slice(0, 10);

export function periodRange(days, now = new Date()) {
  const n = PERIODS.includes(days) ? days : PERIODS[0];
  const dates = [];
  for (let i = n - 1; i >= 0; i--) dates.push(day(new Date(now.getTime() - i * 86400000)));
  return { days: n, since: dates[0], until: dates[dates.length - 1], dates };
}

// One entry per day of the period, zeros where nothing happened.
export function dailySeries(dates, visitRows, registrations) {
  const visits = new Map(visitRows.map((r) => [String(r.timestamp).slice(0, 10), r]));
  const regs = new Map();
  for (const r of registrations) {
    const d = String(r.created_at).slice(0, 10);
    regs.set(d, (regs.get(d) ?? 0) + 1);
  }
  return dates.map((date) => ({
    date,
    visitors: visits.get(date)?.visitors ?? 0,
    pageviews: visits.get(date)?.pageviews ?? 0,
    registrations: regs.get(date) ?? 0,
  }));
}

export function topList(rows, key, emptyLabel = "(ismeretlen)") {
  return rows
    .map((r) => ({ label: r[key] || emptyLabel, visitors: r.visitors ?? 0, pageviews: r.pageviews ?? 0 }))
    .sort((a, b) => b.visitors - a.visitors);
}

export function conversion(registrations, visitors) {
  return visitors > 0 ? Math.round((registrations / visitors) * 1000) / 10 : null;
}
