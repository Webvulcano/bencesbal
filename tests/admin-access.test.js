import { describe, expect, it } from "vitest";
import { adminEmails, isAdminClaims } from "@/lib/admin-access";

const LIST = "lehel200@gmail.com, Masik@Gmail.com";
const google = (email) => ({ email, amr: [{ method: "oauth", timestamp: 1 }] });

describe("Engedélyezett email-lista", () => {
  it("vesszővel elválasztva, kisbetűsítve, szóközök nélkül", () => {
    expect(adminEmails(LIST)).toEqual(["lehel200@gmail.com", "masik@gmail.com"]);
  });

  it("hiányzó vagy üres lista → senki", () => {
    expect(adminEmails(undefined)).toEqual([]);
    expect(isAdminClaims(google("lehel200@gmail.com"), "")).toBe(false);
    expect(isAdminClaims(google("lehel200@gmail.com"), undefined)).toBe(false);
  });
});

describe("Ki admin", () => {
  it("Google-lel belépett, listán lévő cím → igen (kis-nagybetű mindegy)", () => {
    expect(isAdminClaims(google("lehel200@gmail.com"), LIST)).toBe(true);
    expect(isAdminClaims(google("MASIK@gmail.com"), LIST)).toBe(true);
    expect(isAdminClaims({ email: "lehel200@gmail.com", amr: ["oauth"] }, LIST)).toBe(true);
  });

  it("listán nem szereplő Google-fiók → nem", () => {
    expect(isAdminClaims(google("idegen@gmail.com"), LIST)).toBe(false);
  });

  it("jó cím, de nem Google-lel (pl. jelszavas regisztráció) → nem", () => {
    expect(isAdminClaims({ email: "lehel200@gmail.com", amr: [{ method: "password" }] }, LIST)).toBe(false);
    expect(isAdminClaims({ email: "lehel200@gmail.com" }, LIST)).toBe(false);
  });

  it("nincs session → nem", () => {
    expect(isAdminClaims(null, LIST)).toBe(false);
    expect(isAdminClaims(undefined, LIST)).toBe(false);
  });
});
