import { describe, expect, it, vi } from "vitest";
import { reg, ticket } from "./fixtures";

// The PDF stub records which tickets went into each attachment.
vi.mock("@/lib/pdf/ticket", () => ({ buildTicketsPdf: (r) => `PDF:${r.tickets.map((t) => t.holder_name).join(",")}` }));

const { EVENT } = await import("@/lib/constants");
const { renderPayment } = await import("@/lib/email/payment");
const { renderTicket } = await import("@/lib/email/ticket");
const { renderCancellation } = await import("@/lib/email/cancellation");
const { renderConfirmation } = await import("@/lib/email/confirmation");

describe("bál neve", () => {
  it("XIV. Győri Bencés Bál", () => expect(EVENT.name).toBe("XIV. Győri Bencés Bál"));
});

describe("fizetés-visszaigazoló (kapcsolattartónak)", () => {
  it("csak a kapcsolattartó saját jegye van csatolva, és jelzi, hogy a többiek külön kapják", () => {
    const m = renderPayment(reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "bela@example.com")]));
    expect(m.attachments.map((a) => a.content)).toEqual(["PDF:Anna"]);
    expect(m.text).toContain("Elektronikus belépőjegyét a mellékelt PDF-ben találja.");
    expect(m.text).toContain("A többi résztvevő a saját e-mail-címére kapja meg a belépőjegyét.");
  });

  it("közös címen / email nélkül lévők jegye is csatolva, többes számú szöveggel", () => {
    const m = renderPayment(reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Ádám", "anna@example.com"), ticket(3, "Kísérő", null)]));
    expect(m.attachments.map((a) => a.content)).toEqual(["PDF:Anna,Ádám,Kísérő"]);
    expect(m.text).toContain("Elektronikus belépőjegyeiket a mellékelt PDF-ben találják.");
    expect(m.text).not.toContain("A többi résztvevő");
  });

  it("tárgy, összeg és bálnév", () => {
    const m = renderPayment(reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "bela@example.com")]));
    expect(m.subject).toBe("Megérkezett az utalása — XIV. Győri Bencés Bál (GYBB-0042)");
    expect(m.text).toMatch(/160\s000 forint/);
    expect(m.html).toContain("XIV. Győri Bencés Bál");
  });
});

describe("e-jegy (résztvevőnek)", () => {
  it("név szerint szólít, és csak az ő jegyei vannak csatolva", () => {
    const r = reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "par@example.com"), ticket(3, "Bea", "par@example.com")]);
    const m = renderTicket(r, r.tickets.slice(1));
    expect(m.text.startsWith("Kedves Béla!")).toBe(true);
    expect(m.text).toContain("Kovács Anna jelentkezése révén");
    expect(m.attachments.map((a) => a.content)).toEqual(["PDF:Béla,Bea"]);
  });
});

describe("lemondó email", () => {
  it("az ügyfél sablonja szerint, a kapcsolattartó nevével", () => {
    const m = renderCancellation(reg([ticket(1, "Anna", "anna@example.com")]));
    expect(m.text).toContain("Kedves Kovács Anna!");
    expect(m.text).toContain("Tisztelettel jelezzük, hogy a XIV. Győri Bencés Bálba leadott jelentkezése a mai napon törlésre került.");
    expect(m.text).toContain("A bál szervezői");
    expect(m.attachments).toBeUndefined();
  });

  it("a nevet HTML-ben escape-eli", () => {
    const m = renderCancellation(reg([], { contact_name: "<b>X</b>" }));
    expect(m.html).toContain("&lt;b&gt;X&lt;/b&gt;");
  });
});

describe("jelentkezés-visszaigazoló", () => {
  it("minden résztvevőt felsorol, közleménnyel és végösszeggel", () => {
    const m = renderConfirmation(reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "bela@example.com")]));
    expect(m.text).toContain("1. résztvevő: Anna, anna@example.com");
    expect(m.text).toContain("2. résztvevő: Béla, bela@example.com");
    expect(m.text).toContain("GYBB-0042");
    expect(m.text).toMatch(/Végösszeg: 160\s000 Ft/);
  });
});
