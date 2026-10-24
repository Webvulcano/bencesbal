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

// Axis top for small counts: 3 equal integer steps (0, s, 2s, 3s) that cover max.
export function niceAxis(max) {
  const step = Math.max(1, Math.ceil(max / 3));
  return { top: step * 3, ticks: [0, step, step * 2, step * 3] };
}

// Emails sent, for the Gmail daily limit (~500 recipients, rolling 24 h). Unlike the series above, "today" is the
// Budapest calendar day. A participant ticket email covers all tickets of one address sent together, so tickets with
// the same address and timestamp count once. Failed sends have no timestamp and are not counted.
const budapestDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(d);

export function emailsSent(registrations, now = new Date()) {
  const sends = [];
  for (const r of registrations) {
    sends.push(r.confirmationSentAt, r.paymentEmailSentAt, r.cancellationEmailSentAt);
    const ticketSends = new Set(r.members.filter((m) => m.ticketEmailSentAt).map((m) => `${m.email}|${m.ticketEmailSentAt}`));
    for (const key of ticketSends) sends.push(key.slice(key.lastIndexOf("|") + 1));
  }
  const today = budapestDay(now);
  const since = now.getTime() - 86400000;
  let todayCount = 0;
  let last24h = 0;
  for (const ts of sends) {
    if (!ts) continue;
    const d = new Date(ts);
    if (budapestDay(d) === today) todayCount++;
    if (d.getTime() > since && d <= now) last24h++;
  }
  return { today: todayCount, last24h };
}
