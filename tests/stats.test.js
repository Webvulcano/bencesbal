import { describe, expect, it } from "vitest";
import { conversion, dailySeries, niceAxis, periodRange, topList } from "@/lib/stats";

const NOW = new Date("2026-10-21T10:00:00Z");

describe("Időszak", () => {
  it("7 / 28 / 90 nap, a mai nappal bezárólag", () => {
    expect(periodRange(7, NOW)).toMatchObject({ days: 7, since: "2026-10-15", until: "2026-10-21" });
    expect(periodRange(28, NOW).dates).toHaveLength(28);
    expect(periodRange(90, NOW).since).toBe("2026-07-24");
  });

  it("ismeretlen érték → 7 nap", () => {
    expect(periodRange(NaN, NOW).days).toBe(7);
    expect(periodRange(1000, NOW).days).toBe(7);
  });
});

describe("Napi sor", () => {
  it("minden nap szerepel, hiányzó napon 0, a jelentkezések napra számolva", () => {
    const { dates } = periodRange(7, NOW);
    const s = dailySeries(
      dates,
      [{ timestamp: "2026-10-20T00:00:00.000Z", visitors: 12, pageviews: 30 }],
      [{ created_at: "2026-10-20T15:00:00+00:00" }, { created_at: "2026-10-20T18:00:00+00:00" }, { created_at: "2026-10-21T08:00:00+00:00" }],
    );
    expect(s).toHaveLength(7);
    expect(s.find((d) => d.date === "2026-10-20")).toEqual({ date: "2026-10-20", visitors: 12, pageviews: 30, registrations: 2, payments: 0 });
    expect(s.find((d) => d.date === "2026-10-21")).toEqual({ date: "2026-10-21", visitors: 0, pageviews: 0, registrations: 1, payments: 0 });
    expect(s[0].visitors).toBe(0);
  });
});

describe("Fizetések naponta", () => {
  it("a fizetés napjára számít, nem a jelentkezésére; fizetetlen nem számít", () => {
    const { dates } = periodRange(7, NOW);
    const s = dailySeries(dates, [], [
      { created_at: "2026-10-01T10:00:00Z", paid_at: "2026-10-19T09:00:00Z" },
      { created_at: "2026-10-19T10:00:00Z", paid_at: "2026-10-19T12:00:00Z" },
      { created_at: "2026-10-20T10:00:00Z", paid_at: null },
    ]);
    expect(s.find((d) => d.date === "2026-10-19")).toMatchObject({ registrations: 1, payments: 2 });
    expect(s.find((d) => d.date === "2026-10-20")).toMatchObject({ registrations: 1, payments: 0 });
  });
});

describe("Toplista és konverzió", () => {
  it("látogatók szerint csökkenő, üres címke helyett felirat", () => {
    const rows = [{ referrerHostname: "", visitors: 5 }, { referrerHostname: "facebook.com", visitors: 9 }];
    expect(topList(rows, "referrerHostname", "Közvetlen")).toEqual([
      { label: "facebook.com", visitors: 9, pageviews: 0 },
      { label: "Közvetlen", visitors: 5, pageviews: 0 },
    ]);
  });

  it("konverzió egy tizedesre, 0 látogatónál nincs", () => {
    expect(conversion(3, 200)).toBe(1.5);
    expect(conversion(1, 3)).toBe(33.3);
    expect(conversion(5, 0)).toBe(null);
  });
});

describe("Tengely", () => {
  it("3 egész lépés, ami lefedi a maximumot", () => {
    expect(niceAxis(0)).toEqual({ top: 3, ticks: [0, 1, 2, 3] });
    expect(niceAxis(2)).toEqual({ top: 3, ticks: [0, 1, 2, 3] });
    expect(niceAxis(10)).toEqual({ top: 12, ticks: [0, 4, 8, 12] });
  });
});
