import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => null }));
const { seatingRequestText } = await import("@/lib/admin-data");

describe("Ültetési kérés szöveg (export)", () => {
  it("barátkód + megjegyzés együtt", () => {
    const r = { linked: [{ ref: "GYBB-0001", name: "Kovács Anna" }], seatingNote: "ne a színpad mellé" };
    expect(seatingRequestText(r)).toBe("Együtt: GYBB-0001 (Kovács Anna) · Megjegyzés: ne a színpad mellé");
  });

  it("csak megjegyzés", () => {
    expect(seatingRequestText({ linked: [], seatingNote: "a Kovácsékkal" })).toBe("Megjegyzés: a Kovácsékkal");
  });

  it("semmi → üres", () => {
    expect(seatingRequestText({ linked: [], seatingNote: null })).toBe("");
  });
});
