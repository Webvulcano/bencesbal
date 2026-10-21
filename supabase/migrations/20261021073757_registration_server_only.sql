-- Public registrations go only through the server action (secret key), so the
-- JELENTKEZES_NYITVA switch can't be bypassed with the publishable key.
revoke all on function public.create_registration(jsonb) from public, anon, authenticated;
grant execute on function public.create_registration(jsonb) to service_role;
