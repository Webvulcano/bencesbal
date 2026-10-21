-- Per-participant e-ticket email bookkeeping (participants other than the contact person).
alter table public.tickets
  add column ticket_email_sent_at timestamptz,
  add column ticket_email_error text;
