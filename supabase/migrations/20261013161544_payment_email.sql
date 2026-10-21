-- Payment-received email bookkeeping: set by the server after the Gmail send succeeds or fails.
alter table public.registrations
  add column payment_email_sent_at timestamptz,
  add column payment_email_error text;
