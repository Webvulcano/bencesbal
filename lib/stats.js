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
  const paid = new Map();
  const bump = (m, ts) => {
    if (!ts) return;
    const d = String(ts).slice(0, 10);
    m.set(d, (m.get(d) ?? 0) + 1);
  };
  for (const r of registrations) {
    bump(regs, r.created_at);
    bump(paid, r.paid_at);
  }
  return dates.map((date) => ({
    date,
    visitors: visits.get(date)?.visitors ?? 0,
    pageviews: visits.get(date)?.pageviews ?? 0,
    registrations: regs.get(date) ?? 0,
    payments: paid.get(date) ?? 0,
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

// Axis top for small counts: 3 equal integer steps (0, s, 2s, 3s) that cover max.
export function niceAxis(max) {
  const step = Math.max(1, Math.ceil(max / 3));
  return { top: step * 3, ticks: [0, step, step * 2, step * 3] };
}
