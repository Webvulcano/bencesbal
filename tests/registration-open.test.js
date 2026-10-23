import { describe, expect, it } from "vitest";
import { isRegistrationOpen, parseOpeningTime } from "@/lib/registration-open";

const OPENS = "2026-11-01T10:00:00+01:00";
const BEFORE = Date.parse("2026-11-01T08:59:59Z");
const AT = Date.parse("2026-11-01T09:00:00Z");

describe("Jelentkezés nyitva / zárva", () => {
  it("kézi kapcsoló: JELENTKEZES_NYITVA=true → nyitva, időponttól függetlenül", () => {
    expect(isRegistrationOpen({ JELENTKEZES_NYITVA: "true" }, BEFORE)).toBe(true);
    expect(isRegistrationOpen({ JELENTKEZES_NYITVA: "true", JELENTKEZES_NYITAS: OPENS }, BEFORE)).toBe(true);
  });

  it("nincs semmi beállítva → zárva", () => {
    expect(isRegistrationOpen({}, AT)).toBe(false);
    expect(isRegistrationOpen({ JELENTKEZES_NYITVA: "false" }, AT)).toBe(false);
  });

  it("időzítés: a megadott időpont előtt zárva, attól kezdve nyitva", () => {
    const env = { JELENTKEZES_NYITAS: OPENS };
    expect(isRegistrationOpen(env, BEFORE)).toBe(false);
    expect(isRegistrationOpen(env, AT)).toBe(true);
    expect(isRegistrationOpen(env, AT + 86_400_000)).toBe(true);
  });

  it("hibás vagy időzóna nélküli időpont → zárva (nem nyit korábban)", () => {
    expect(parseOpeningTime("2026-11-01T10:00")).toBeNull();
    expect(parseOpeningTime("holnap")).toBeNull();
    expect(parseOpeningTime("")).toBeNull();
    expect(isRegistrationOpen({ JELENTKEZES_NYITAS: "2026-11-01T10:00" }, AT)).toBe(false);
  });

  it("Z és +02:00 eltolás is működik", () => {
    expect(parseOpeningTime("2026-11-01T09:00:00Z")).toBe(AT);
    expect(parseOpeningTime(" 2026-11-01T11:00:00+02:00 ")).toBe(AT);
  });
});
