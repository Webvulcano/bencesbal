import { describe, expect, it } from "vitest";
import { splitTickets } from "@/lib/email/recipients";
import { reg, ticket } from "./fixtures";

const names = (ts) => ts.map((t) => t.holder_name);
const routes = (r) => {
  const { contact, byEmail } = splitTickets(r);
  return { contact: names(contact), byEmail: Object.fromEntries([...byEmail].map(([e, ts]) => [e, names(ts)])) };
};

describe("splitTickets — ki melyik jegyet kapja", () => {
  it("mindenki csak a saját jegyét kapja, a kapcsolattartó is", () => {
    const r = reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "bela@example.com"), ticket(3, "Cili", "cili@example.com")]);
    expect(routes(r)).toEqual({ contact: ["Anna"], byEmail: { "bela@example.com": ["Béla"], "cili@example.com": ["Cili"] } });
  });

  it("azonos email-cím → 1 email, több jegy", () => {
    const r = reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "par@example.com"), ticket(3, "Bea", "par@example.com")]);
    expect(routes(r).byEmail).toEqual({ "par@example.com": ["Béla", "Bea"] });
  });

  it("a kapcsolattartóval közös címen lévő résztvevő jegye a kapcsolattartó emailjébe megy", () => {
    const r = reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Ádám", "anna@example.com")]);
    expect(routes(r)).toEqual({ contact: ["Anna", "Ádám"], byEmail: {} });
  });

  it("email nélküli résztvevő (kézi felvétel) jegye a kapcsolattartóhoz megy", () => {
    const r = reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Kísérő", null), ticket(3, "Kísérő 2", "  ")]);
    expect(routes(r)).toEqual({ contact: ["Anna", "Kísérő", "Kísérő 2"], byEmail: {} });
  });

  it("kis-nagybetű és szóköz nem számít az email-címben", () => {
    const r = reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", " Bela@Example.com"), ticket(3, "Bea", "bela@example.com ")], {
      contact_email: " ANNA@example.com",
    });
    expect(routes(r)).toEqual({ contact: ["Anna"], byEmail: { "bela@example.com": ["Béla", "Bea"] } });
  });

  it("a jegyek beviteli sorrendben (seq) maradnak, akárhogy jön az adatbázisból", () => {
    const r = reg([ticket(3, "Cili", "x@example.com"), ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "x@example.com")]);
    expect(routes(r).byEmail["x@example.com"]).toEqual(["Béla", "Cili"]);
  });
});
