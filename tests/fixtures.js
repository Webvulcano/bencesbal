// Registration rows shaped like `registrations.select("*, tickets(*)")`.
let id = 0;
export const ticket = (seq, name, email, extra = {}) => ({
  id: ++id, seq, ticket_type_id: "disz_arany", hall_id: "disz", price: 80000, holder_name: name, holder_email: email, ticket_email_sent_at: null, ...extra,
});

export const reg = (tickets, extra = {}) => ({
  ref: "GYBB-0042",
  status: "pending",
  contact_name: "Kovács Anna",
  contact_email: "anna@example.com",
  total: tickets.length * 80000,
  created_at: "2026-10-15T10:00:00Z",
  tickets,
  ...extra,
});
