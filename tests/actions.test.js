import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";
import { reg, ticket } from "./fixtures";

const state = vi.hoisted(() => ({ db: null, sent: [], pending: [], failFor: null }));

vi.mock("next/server", () => ({ after: (fn) => state.pending.push(fn) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => state.db }));
vi.mock("@/lib/mailer", () => ({
  sendMail: async (m) => {
    if (m.to === state.failFor) throw new Error("SMTP down");
    state.sent.push(m);
  },
}));
vi.mock("@/lib/pdf/ticket", () => ({ buildTicketsPdf: (r) => `PDF:${r.tickets.map((t) => t.holder_name).join(",")}` }));

const { markPaid, cancelRegistration, createGuest } = await import("@/app/admin/actions");

const form = (ref) => {
  const f = new FormData();
  f.set("ref", ref);
  return f;
};
// Runs the after() callbacks, like Next.js does once the response is sent.
const flush = async () => {
  while (state.pending.length) await state.pending.shift()();
};
const mails = () => state.sent.map((m) => ({ to: m.to, subject: m.subject.split(" — ")[0], pdf: m.attachments?.map((a) => a.content) ?? [] }));

const family = () =>
  reg([ticket(1, "Anna", "anna@example.com"), ticket(2, "Béla", "par@example.com"), ticket(3, "Bea", "par@example.com"), ticket(4, "Cili", "cili@example.com")]);

beforeEach(() => {
  state.sent = [];
  state.pending = [];
  state.failFor = null;
});

describe("Fizetve gomb", () => {
  it("nem fizetett → fizetés-email a kapcsolattartónak + mindenki a saját címére a saját jegyét", async () => {
    state.db = fakeDb([family()]);
    await markPaid(form("GYBB-0042"));
    await flush();
    expect(mails()).toEqual([
      { to: "anna@example.com", subject: "Megérkezett az utalása", pdf: ["PDF:Anna"] },
      { to: "par@example.com", subject: "Belépőjegy", pdf: ["PDF:Béla,Bea"] },
      { to: "cili@example.com", subject: "Belépőjegy", pdf: ["PDF:Cili"] },
    ]);
  });

  it("rögzíti a küldést (payment_email_sent_at, ticket_email_sent_at)", async () => {
    state.db = fakeDb([family()]);
    await markPaid(form("GYBB-0042"));
    await flush();
    const r = state.db.byRef.get("GYBB-0042");
    expect(r.payment_email_sent_at).toBeTruthy();
    expect(r.tickets.filter((t) => t.seq > 1).every((t) => t.ticket_email_sent_at)).toBe(true);
  });

  it("dupla kattintás → csak egyszer mennek ki az emailek", async () => {
    state.db = fakeDb([family()]);
    await markPaid(form("GYBB-0042"));
    await markPaid(form("GYBB-0042"));
    await flush();
    expect(state.sent).toHaveLength(3);
  });

  it("már fizetett → nem megy ki újra semmi", async () => {
    state.db = fakeDb([reg([ticket(1, "Anna", "anna@example.com")], { status: "paid" })]);
    await markPaid(form("GYBB-0042"));
    await flush();
    expect(state.sent).toHaveLength(0);
  });

  it("egy email hibája nem állítja meg a többit, és a hiba rögzítődik", async () => {
    state.db = fakeDb([family()]);
    state.failFor = "par@example.com";
    await markPaid(form("GYBB-0042"));
    await flush();
    expect(mails().map((m) => m.to)).toEqual(["anna@example.com", "cili@example.com"]);
    const t = state.db.byRef.get("GYBB-0042").tickets.find((x) => x.holder_name === "Béla");
    expect(t.ticket_email_error).toBe("SMTP down");
  });
});

describe("Lemondás gomb", () => {
  it("nem fizetett → lemondó email a kapcsolattartónak", async () => {
    state.db = fakeDb([family()]);
    await cancelRegistration(form("GYBB-0042"));
    await flush();
    expect(mails()).toEqual([{ to: "anna@example.com", subject: "Jelentkezés törölve", pdf: [] }]);
    expect(state.db.byRef.get("GYBB-0042").cancellation_email_sent_at).toBeTruthy();
  });

  it("fizetett → nem megy ki email", async () => {
    state.db = fakeDb([reg([ticket(1, "Anna", "anna@example.com")], { status: "paid" })]);
    await cancelRegistration(form("GYBB-0042"));
    await flush();
    expect(state.sent).toHaveLength(0);
    expect(state.db.byRef.get("GYBB-0042").status).toBe("cancelled");
  });

  it("már lemondott → nem megy ki újra", async () => {
    state.db = fakeDb([reg([ticket(1, "Anna", "anna@example.com")], { status: "cancelled" })]);
    await cancelRegistration(form("GYBB-0042"));
    await flush();
    expect(state.sent).toHaveLength(0);
  });
});

describe("Kézi vendég felvétele", () => {
  const payload = (extra) => ({ contact: { name: "Vendég", email: "vendeg@example.com" }, companions: [], qty: { tisztelet_disz: 1 }, ...extra });

  it("email nélkül → hibaüzenet", async () => {
    state.db = fakeDb([]);
    expect(await createGuest(payload({ contact: { name: "Vendég", email: "" } }))).toEqual({ error: "A kapcsolattartó email-címe kötelező." });
  });

  it("rögtön fizetettként → kimennek az emailek, email nélküli kísérő jegye a kapcsolattartónál", async () => {
    state.db = fakeDb([
      reg([ticket(1, "Vendég", "vendeg@example.com"), ticket(2, "Kísérő", null), ticket(3, "Barát", "barat@example.com")], {
        ref: "GYBB-0099",
        contact_name: "Vendég",
        contact_email: "vendeg@example.com",
        status: "paid",
      }),
    ]);
    const res = await createGuest(payload({ markPaid: true }));
    await flush();
    expect(res).toEqual({ ref: "GYBB-0099" });
    expect(mails()).toEqual([
      { to: "vendeg@example.com", subject: "Megérkezett az utalása", pdf: ["PDF:Vendég,Kísérő"] },
      { to: "barat@example.com", subject: "Belépőjegy", pdf: ["PDF:Barát"] },
    ]);
  });

  it("nem fizetettként → nem megy ki email", async () => {
    state.db = fakeDb([]);
    await createGuest(payload({ markPaid: false }));
    await flush();
    expect(state.sent).toHaveLength(0);
  });
});
