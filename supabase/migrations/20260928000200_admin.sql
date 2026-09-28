create sequence public.ticket_no_seq start 1;

alter table public.tickets add column ticket_no int unique;
alter table public.registrations add column paid_at timestamptz;
alter table public.registrations add column cancelled_at timestamptz;

create or replace function public.mark_paid(p_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_status text;
  t record;
begin
  select id, status into v_id, v_status from public.registrations where ref = p_ref for update;
  if v_id is null then raise exception 'NOT_FOUND'; end if;
  if v_status = 'paid' then return; end if;
  if v_status = 'cancelled' then raise exception 'CANCELLED'; end if;

  update public.registrations set status = 'paid', paid_at = now() where id = v_id;
  for t in select id from public.tickets where registration_id = v_id and ticket_no is null order by seq loop
    update public.tickets set ticket_no = nextval('public.ticket_no_seq') where id = t.id;
  end loop;
end;
$$;

create or replace function public.cancel_registration(p_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.registrations set status = 'cancelled', cancelled_at = now()
  where ref = p_ref and status <> 'cancelled';
  if not found and not exists (select 1 from public.registrations where ref = p_ref) then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.mark_paid(text) from public, anon, authenticated;
revoke all on function public.cancel_registration(text) from public, anon, authenticated;
grant execute on function public.mark_paid(text) to service_role;
grant execute on function public.cancel_registration(text) to service_role;
