-- Late price: from late_from (2026-11-16 00:00 Budapest) the plain Díszterem / Különterem tickets cost +5000 Ft.
-- Registrations made before keep their stored price/total; only new ones use the late price.
alter table public.ticket_types
  add column late_price int check (late_price >= 0),
  add column late_from timestamptz,
  add constraint ticket_types_late_both check ((late_price is null) = (late_from is null));

update public.ticket_types set late_price = 55000, late_from = '2026-11-16 00:00:00 Europe/Budapest' where id = 'disz';
update public.ticket_types set late_price = 45000, late_from = '2026-11-16 00:00:00 Europe/Budapest' where id = 'kulon';

-- Price of a ticket type right now.
create or replace function public.ticket_price(p_price int, p_late_price int, p_late_from timestamptz)
returns int
language sql
stable
set search_path = ''
as $$
  select case when p_late_from is not null and now() >= p_late_from then p_late_price else p_price end;
$$;

-- create_registration: same as 20261020104903_seating_note, with the current price instead of tt.price.
create or replace function public.create_registration(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact jsonb := payload->'contact';
  v_addr jsonb := payload->'address';
  v_rel jsonb := coalesce(payload->'relation', '{}'::jsonb);
  v_qty jsonb := coalesce(payload->'qty', '{}'::jsonb);
  v_companions jsonb := coalesce(payload->'companions', '[]'::jsonb);
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
  if coalesce((payload->>'consent')::boolean, false) is not true then
    raise exception 'CONSENT_REQUIRED';
  end if;
  if coalesce(trim(v_contact->>'name'), '') = '' or coalesce(v_contact->>'email', '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     or coalesce(trim(v_contact->>'phone'), '') = '' then
    raise exception 'INVALID_CONTACT';
  end if;
  if coalesce(trim(v_addr->>'zip'), '') = '' or coalesce(trim(v_addr->>'city'), '') = ''
     or coalesce(trim(v_addr->>'street'), '') = '' or coalesce(trim(v_addr->>'no'), '') = '' then
    raise exception 'INVALID_ADDRESS';
  end if;
  if coalesce(v_rel->>'type', '') not in ('oregdiak','szulo','munkatars','tamogato','egyeb') then
    raise exception 'INVALID_RELATION';
  end if;

  if exists (select 1 from jsonb_object_keys(v_qty) k where k not in (select id from public.ticket_types where is_public)) then
    raise exception 'INVALID_TICKET_TYPE';
  end if;
  for tt in select * from public.ticket_types where is_public order by sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    if n < 0 then raise exception 'INVALID_QTY'; end if;
    v_count := v_count + n;
    v_total := v_total + n * public.ticket_price(tt.price, tt.late_price, tt.late_from);
  end loop;
  if v_count < 1 or v_count > 20 then raise exception 'INVALID_QTY'; end if;
  if jsonb_array_length(v_companions) <> v_count - 1 then raise exception 'COMPANIONS_MISMATCH'; end if;
  for i in 0 .. jsonb_array_length(v_companions) - 1 loop
    if coalesce(trim(v_companions->i->>'name'), '') = '' or coalesce(v_companions->i->>'email', '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'INVALID_COMPANION';
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

  -- lock halls so concurrent registrations serialize on the capacity check
  for h in select * from public.halls order by id for update loop
    select coalesce(sum((v_qty->>t.id)::int), 0) into n
    from public.ticket_types t where t.hall_id = h.id and t.is_public and v_qty ? t.id;
    if n > 0 and n > (select f.free from public.free_seats() f where f.hall_id = h.id) then
      raise exception 'SOLD_OUT:%', h.id;
    end if;
  end loop;

  v_ref := 'GYBB-' || lpad(nextval('public.registration_ref_seq')::text, 4, '0');

  insert into public.registrations (ref, contact_name, contact_email, contact_phone, zip, city, street, house_no, floor,
    relation, paper_ticket, consent_at, total, seating_note)
  values (v_ref, trim(v_contact->>'name'), lower(trim(v_contact->>'email')), trim(v_contact->>'phone'),
    trim(v_addr->>'zip'), trim(v_addr->>'city'), trim(v_addr->>'street'), trim(v_addr->>'no'), nullif(trim(v_addr->>'floor'), ''),
    v_rel, coalesce((payload->>'paperTicket')::boolean, false), now(), v_total,
    nullif(left(trim(coalesce(payload->>'seatingNote', '')), 500), ''))
  returning id into v_reg_id;

  -- ticket order must match the client: public types by sort, contact gets seq 1
  for tt in select * from public.ticket_types where is_public order by sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    for i in 1 .. n loop
      v_holder := case when v_seq = 0 then v_contact else v_companions->(v_seq - 1) end;
      insert into public.tickets (registration_id, seq, ticket_type_id, hall_id, price, holder_name, holder_email, is_contact)
      values (v_reg_id, v_seq + 1, tt.id, tt.hall_id, public.ticket_price(tt.price, tt.late_price, tt.late_from), trim(v_holder->>'name'), lower(trim(v_holder->>'email')), v_seq = 0);
      v_seq := v_seq + 1;
    end loop;
  end loop;

  insert into public.friend_links (registration_id, friend_ref)
  select v_reg_id, c from unnest(v_codes) c where c <> v_ref;

  return v_ref;
end;
$$;


-- admin_create_registration: same as 20261015092257_admin_guest_email_required, with the current price.
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
  if v_email is null then raise exception 'EMAIL_REQUIRED'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID_EMAIL'; end if;
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
    v_total := v_total + n * public.ticket_price(tt.price, tt.late_price, tt.late_from);
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

  for tt in select * from public.ticket_types order by sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    for i in 1 .. n loop
      v_holder := case when v_seq = 0 then v_contact else v_companions->(v_seq - 1) end;
      insert into public.tickets (registration_id, seq, ticket_type_id, hall_id, price, holder_name, holder_email, is_contact)
      values (v_reg_id, v_seq + 1, tt.id, tt.hall_id, public.ticket_price(tt.price, tt.late_price, tt.late_from), trim(v_holder->>'name'),
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
