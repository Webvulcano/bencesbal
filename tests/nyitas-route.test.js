import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/elozetes/nyitas/route";

describe("Előzetes oldal visszaszámláló időpontja (/elozetes/nyitas)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("a JELENTKEZES_NYITAS időpontját adja vissza UTC-ben", async () => {
    vi.stubEnv("JELENTKEZES_NYITAS", "2026-11-01T10:00:00+01:00");
    expect(await GET().json()).toEqual({ opensAt: "2026-11-01T09:00:00.000Z" });
  });

  it("nincs vagy hibás időpont (pl. időzóna nélkül) → null, a számláló nem indul", async () => {
    vi.stubEnv("JELENTKEZES_NYITAS", "");
    expect(await GET().json()).toEqual({ opensAt: null });
    vi.stubEnv("JELENTKEZES_NYITAS", "2026-11-01T10:00");
    expect(await GET().json()).toEqual({ opensAt: null });
  });
});
