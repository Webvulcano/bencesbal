import { expect, it } from "vitest";
import { buildTicketsPdf } from "@/lib/pdf/ticket";
import { reg, ticket } from "./fixtures";

it("valódi PDF-jegy elkészül (résztvevőnként 1 oldal)", () => {
  const pdf = buildTicketsPdf(reg([ticket(1, "Anna", "anna@example.com", { ticket_no: 1 }), ticket(2, "Árvíztűrő Tükörfúrógép", null, { ticket_no: 2 })]));
  const buf = Buffer.from(pdf);
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(buf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2);
});
