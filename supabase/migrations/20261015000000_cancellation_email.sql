-- Cancellation email bookkeeping (unpaid registrations only): set by the server after the Gmail send succeeds or fails.
alter table public.registrations
  add column cancellation_email_sent_at timestamptz,
  add column cancellation_email_error text;
