import { describe, expect, it } from "vitest";
import { dailySeries, dateSlices, emailsSent, niceAxis, periodRange, topList } from "@/lib/stats";

const NOW = new Date("2026-10-21T10:00:00Z");

describe("Időszak", () => {
  it("7 / 28 nap, a mai nappal bezárólag; az URL-ből szövegként jön", () => {
    expect(periodRange("7", NOW)).toMatchObject({ key: 7, since: "2026-10-15", until: "2026-10-21" });
    expect(periodRange("28", NOW).dates).toHaveLength(28);
  });

  it("teljes időszak: a nyitás (UTC) napjától máig; nyitás nélkül 28 nap", () => {
    const open = Date.parse("2026-10-25T00:00:00+02:00"); // UTC: 10-24 22:00
    expect(periodRange("teljes", new Date("2027-02-07T10:00:00Z"), open)).toMatchObject({ key: "teljes", since: "2026-10-24", until: "2027-02-07" });
    expect(periodRange("teljes", NOW, open).dates).toEqual(["2026-10-21"]);
    expect(periodRange("teljes", NOW).dates).toHaveLength(28);
  });

  it("nyitás előtti napok egyik nézetben sincsenek; a nyitás napján a nyitás pillanatától számol", () => {
    const open = Date.parse("2026-10-24T22:00:00Z");
    const r = periodRange("28", new Date("2026-10-30T10:00:00Z"), open);
    expect(r).toMatchObject({ since: "2026-10-24", until: "2026-10-30", from: "2026-10-24T22:00:00.000Z" });
    expect(r.dates).toHaveLength(7);
    expect(periodRange("7", new Date("2026-12-01T10:00:00Z"), open).from).toBe("2026-11-25T00:00:00.000Z");
    expect(periodRange("7", NOW, open)).toMatchObject({ dates: ["2026-10-21"], from: "2026-10-24T22:00:00.000Z" });
  });

  it("ismeretlen érték → 7 nap", () => {
    expect(periodRange(undefined, NOW).key).toBe(7);
    expect(periodRange("90", NOW).key).toBe(7);
  });

  it("napi lekérdezés max. 60 napos szeletekben", () => {
    const { dates } = periodRange("teljes", new Date("2027-02-07T10:00:00Z"), Date.parse("2026-10-24T22:00:00Z"));
    expect(dateSlices(dates)).toEqual([
      { since: "2026-10-24", until: "2026-12-22" },
      { since: "2026-12-23", until: "2027-02-07" },
    ]);
    expect(dateSlices(["2026-10-21"])).toEqual([{ since: "2026-10-21", until: "2026-10-21" }]);
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
});

describe("Tengely", () => {
  it("3 egész lépés, ami lefedi a maximumot", () => {
    expect(niceAxis(0)).toEqual({ top: 3, ticks: [0, 1, 2, 3] });
    expect(niceAxis(2)).toEqual({ top: 3, ticks: [0, 1, 2, 3] });
    expect(niceAxis(10)).toEqual({ top: 12, ticks: [0, 4, 8, 12] });
  });
});

describe("Kiküldött emailek", () => {
  // 2026-10-23 10:00 Budapest (CEST, UTC+2)
  const at = new Date("2026-10-23T08:00:00Z");
  const reg = (over = {}, members = []) => ({ confirmationSentAt: null, paymentEmailSentAt: null, cancellationEmailSentAt: null, members, ...over });

  it("ma (budapesti nap) és utolsó 24 óra külön", () => {
    const regs = [
      reg({ confirmationSentAt: "2026-10-23T07:00:00Z", paymentEmailSentAt: "2026-10-22T22:30:00Z" }), // ma 09:00, ma 00:30
      reg({ confirmationSentAt: "2026-10-22T21:30:00Z" }), // tegnap 23:30 Budapest, de 24 órán belül
      reg({ confirmationSentAt: "2026-10-21T10:00:00Z", cancellationEmailSentAt: "2026-10-23T07:59:00Z" }),
    ];
    expect(emailsSent(regs, at)).toEqual({ today: 3, last24h: 4 });
  });

  it("résztvevői jegy: egy cím + egy időpont = 1 email, hibás (időpont nélküli) nem számít", () => {
    const ts = "2026-10-23T07:00:00Z";
    const members = [
      { email: "a@x.hu", ticketEmailSentAt: ts },
      { email: "a@x.hu", ticketEmailSentAt: ts },
      { email: "b@x.hu", ticketEmailSentAt: ts },
      { email: "c@x.hu", ticketEmailSentAt: null },
    ];
    expect(emailsSent([reg({}, members)], at)).toEqual({ today: 2, last24h: 2 });
  });

  it("nincs küldés → 0", () => {
    expect(emailsSent([], at)).toEqual({ today: 0, last24h: 0 });
  });
});
