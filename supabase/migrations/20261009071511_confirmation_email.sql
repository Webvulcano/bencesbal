-- Confirmation email bookkeeping: set by the server after the Gmail send succeeds or fails.
alter table public.registrations
  add column confirmation_sent_at timestamptz,
  add column confirmation_error text;
