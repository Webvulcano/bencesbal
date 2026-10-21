alter table public.registrations add column printed_at timestamptz;

create or replace function public.set_printed(p_refs text[], p_printed boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.registrations
  set printed_at = case when p_printed then coalesce(printed_at, now()) else null end
  where ref = any(p_refs);
$$;

revoke all on function public.set_printed(text[], boolean) from public, anon, authenticated;
grant execute on function public.set_printed(text[], boolean) to service_role;
