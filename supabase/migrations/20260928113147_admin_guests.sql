alter table public.registrations
  add column source text not null default 'web' check (source in ('web','admin')),
  add column guest_category text,
  add column note text;

-- invited guests may have no email/phone/address/consent; the public RPC still enforces them
alter table public.registrations
  alter column contact_email drop not null,
  alter column contact_phone drop not null,
  alter column zip drop not null,
  alter column city drop not null,
  alter column street drop not null,
  alter column house_no drop not null,
  alter column consent_at drop not null;
alter table public.tickets alter column holder_email drop not null;

create or replace function public.admin_create_registration(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact jsonb := payload->'contact';
  v_addr jsonb := coalesce(payload->'address', '{}'::jsonb);
  v_qty jsonb := coalesce(payload->'qty', '{}'::jsonb);
  v_companions jsonb := coalesce(payload->'companions', '[]'::jsonb);
  v_paper boolean := coalesce((payload->>'paperTicket')::boolean, false);
  v_email text := nullif(lower(trim(v_contact->>'email')), '');
  v_codes text[];
  v_code text;
  v_count int := 0;
  v_total int := 0;
  v_reg_id bigint;
  v_ref text;
  v_seq int := 0;
  v_holder jsonb;
  tt record;
  h record;
  n int;
  i int;
begin
  if coalesce(trim(v_contact->>'name'), '') = '' then raise exception 'INVALID_CONTACT'; end if;
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID_EMAIL'; end if;
  if v_paper and (coalesce(trim(v_addr->>'zip'), '') = '' or coalesce(trim(v_addr->>'city'), '') = ''
     or coalesce(trim(v_addr->>'street'), '') = '' or coalesce(trim(v_addr->>'no'), '') = '') then
    raise exception 'ADDRESS_REQUIRED';
  end if;

  if exists (select 1 from jsonb_object_keys(v_qty) k where k not in (select id from public.ticket_types)) then
    raise exception 'INVALID_TICKET_TYPE';
  end if;
  for tt in select * from public.ticket_types order by sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    if n < 0 then raise exception 'INVALID_QTY'; end if;
    v_count := v_count + n;
    v_total := v_total + n * tt.price;
  end loop;
  if v_count < 1 or v_count > 50 then raise exception 'INVALID_QTY'; end if;
  if jsonb_array_length(v_companions) <> v_count - 1 then raise exception 'COMPANIONS_MISMATCH'; end if;
  for i in 0 .. jsonb_array_length(v_companions) - 1 loop
    if coalesce(trim(v_companions->i->>'name'), '') = '' then raise exception 'INVALID_COMPANION'; end if;
    if coalesce(trim(v_companions->i->>'email'), '') <> '' and v_companions->i->>'email' !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'INVALID_EMAIL';
    end if;
  end loop;

  select coalesce(array_agg(distinct upper(trim(c))), '{}') into v_codes
  from jsonb_array_elements_text(coalesce(payload->'friendCodes', '[]'::jsonb)) c
  where trim(c) <> '';
  foreach v_code in array v_codes loop
    if not exists (select 1 from public.registrations where ref = v_code and status <> 'cancelled') then
      raise exception 'BAD_FRIEND_CODE:%', v_code;
    end if;
  end loop;

  for h in select * from public.halls order by id for update loop
    select coalesce(sum((v_qty->>t.id)::int), 0) into n
    from public.ticket_types t where t.hall_id = h.id and v_qty ? t.id;
    if n > 0 and n > (select f.free from public.free_seats() f where f.hall_id = h.id) then
      raise exception 'SOLD_OUT:%', h.id;
    end if;
  end loop;

  v_ref := 'GYBB-' || lpad(nextval('public.registration_ref_seq')::text, 4, '0');

  insert into public.registrations (ref, source, guest_category, note, contact_name, contact_email, contact_phone,
    zip, city, street, house_no, floor, relation, paper_ticket, consent_at, total)
  values (v_ref, 'admin', nullif(trim(payload->>'guestCategory'), ''), nullif(trim(payload->>'note'), ''),
    trim(v_contact->>'name'), v_email, nullif(trim(v_contact->>'phone'), ''),
    nullif(trim(v_addr->>'zip'), ''), nullif(trim(v_addr->>'city'), ''), nullif(trim(v_addr->>'street'), ''),
    nullif(trim(v_addr->>'no'), ''), nullif(trim(v_addr->>'floor'), ''),
    '{}'::jsonb, v_paper, null, v_total)
  returning id into v_reg_id;

  -- same ticket order as the admin form: all types by sort, contact gets seq 1
  for tt in select * from public.ticket_types order by sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    for i in 1 .. n loop
      v_holder := case when v_seq = 0 then v_contact else v_companions->(v_seq - 1) end;
      insert into public.tickets (registration_id, seq, ticket_type_id, hall_id, price, holder_name, holder_email, is_contact)
      values (v_reg_id, v_seq + 1, tt.id, tt.hall_id, tt.price, trim(v_holder->>'name'),
        nullif(lower(trim(v_holder->>'email')), ''), v_seq = 0);
      v_seq := v_seq + 1;
    end loop;
  end loop;

  insert into public.friend_links (registration_id, friend_ref)
  select v_reg_id, c from unnest(v_codes) c where c <> v_ref;

  if coalesce((payload->>'markPaid')::boolean, false) then
    perform public.mark_paid(v_ref);
  end if;

  return v_ref;
end;
$$;

revoke all on function public.admin_create_registration(jsonb) from public, anon, authenticated;
grant execute on function public.admin_create_registration(jsonb) to service_role;
