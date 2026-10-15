// Who gets which e-ticket after payment. Pure, so it is unit-tested (tests/recipients.test.js).
//   contact: tickets on the contact's own address (theirs + anyone sharing it) and those with no email (admin guests)
//   byEmail: every other address → that person's own tickets, in entry order; one email per address
export const normEmail = (e) => (e ?? "").trim().toLowerCase();

export function splitTickets(reg) {
  const contactEmail = normEmail(reg.contact_email);
  const contact = [];
  const byEmail = new Map();
  for (const t of [...reg.tickets].sort((a, b) => a.seq - b.seq)) {
    const email = normEmail(t.holder_email);
    if (!email || email === contactEmail) contact.push(t);
    else {
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email).push(t);
    }
  }
  return { contact, byEmail };
}
