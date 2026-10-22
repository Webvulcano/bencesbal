"use client";
import { useState } from "react";
import { niceAxis } from "@/lib/stats";

const W = 1000;
const H = 240;
const num = (n) => new Intl.NumberFormat("hu-HU").format(n);
const label = (d) => d.slice(0, 10).replaceAll("-", ". ") + ".";

// Search Console style: metric tiles toggle the lines; every line has its own scale,
// the first selected metric labels the left axis, the second the right one.
export default function StatsChart({ series, metrics, extra, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  const [hover, setHover] = useState(null);
  const active = metrics.filter((m) => on.includes(m.key));
  const axes = Object.fromEntries(active.map((m) => [m.key, niceAxis(Math.max(0, ...series.map((d) => d[m.key])))]));
  const n = series.length;
  const x = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v, key) => H - (v / axes[key].top) * H;
  const [left, right] = active;
  const every = Math.ceil(n / 8);
  const toggle = (key) => setOn((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  return (
    <div className="bg-white border border-line/70 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const sel = on.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              aria-pressed={sel}
              style={sel ? { backgroundColor: m.color } : undefined}
              className={`text-left px-5 py-4 border-b border-r border-line/50 cursor-pointer transition ${sel ? "text-white" : "hover:bg-[#f7f6f2]"}`}
            >
              <p className={`text-sm flex items-center gap-2 ${sel ? "text-white/90" : "text-muted"}`}>
                <span className={`inline-block w-3.5 h-3.5 rounded-sm border ${sel ? "bg-white/90 border-white" : "border-muted"}`} />
                {m.label}
              </p>
              <p className={`text-3xl font-bold mt-1 tabular-nums ${sel ? "" : "text-navy-2"}`}>{m.value}</p>
              {m.sub && <p className={`text-sm mt-0.5 ${sel ? "text-white/80" : "text-muted"}`}>{m.sub}</p>}
            </button>
          );
        })}
        {extra}
      </div>

      <div className="px-4 sm:px-6 pt-5 pb-4">
        <div className="flex justify-between text-xs text-muted mb-2 min-h-4">
          <span>{left?.label}</span>
          <span>{right?.label}</span>
        </div>
        <div className="relative pl-8 pr-8">
          {/* grid + axis labels */}
          <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
            {[0, 1, 2, 3].map((t) => (
              <div key={t} className="absolute left-8 right-8 border-t border-line/50" style={{ top: `${100 - (t / 3) * 100}%` }}>
                <span className="absolute -left-8 w-7 -translate-y-1/2 text-right text-xs text-muted tabular-nums">
                  {left ? num(axes[left.key].ticks[t]) : ""}
                </span>
                <span className="absolute -right-8 w-7 -translate-y-1/2 text-left text-xs text-muted tabular-nums">
                  {right ? num(axes[right.key].ticks[t]) : ""}
                </span>
              </div>
            ))}
          </div>

          <div
            className="relative h-60"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
            }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
              {active.map((m) => (
                <polyline
                  key={m.key}
                  fill="none"
                  stroke={m.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  points={series.map((d, i) => `${x(i)},${y(d[m.key], m.key)}`).join(" ")}
                />
              ))}
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="#999" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
            </svg>

            {hover !== null && active.length > 0 && (
              <div
                className="absolute top-2 z-10 bg-white border border-line rounded-md shadow-md px-3 py-2 text-sm whitespace-nowrap pointer-events-none"
                style={hover > n / 2 ? { right: `${100 - (hover / Math.max(1, n - 1)) * 100}%`, marginRight: 8 } : { left: `${(hover / Math.max(1, n - 1)) * 100}%`, marginLeft: 8 }}
              >
                <p className="font-bold mb-1">{label(series[hover].date)}</p>
                {active.map((m) => (
                  <p key={m.key} className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label}: <b className="tabular-nums">{num(series[hover][m.key])}</b>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative h-5 mt-2 mx-8">
          {series.map((d, i) =>
            i % every === 0 ? (
              <span key={d.date} className="absolute -translate-x-1/2 text-xs text-muted whitespace-nowrap" style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
                {label(d.date).slice(6)}
              </span>
            ) : null,
          )}
        </div>
        {active.length === 0 && <p className="text-sm text-muted text-center -mt-32 mb-28">Kérjük, válasszon fent legalább egy mutatót.</p>}
      </div>
    </div>
  );
}
