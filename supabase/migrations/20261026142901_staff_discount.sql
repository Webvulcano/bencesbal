-- Staff discount: a munkatárs with the right code (staff_discount.code) gets percent off on up to max_tickets
-- tickets of the eligible types (ticket_types.staff_discount: the plain Díszterem / Különterem tickets).
-- payload.discountSeats (0-based seat indexes, contact = 0) picks which seats; without it the first eligible ones.
-- The code lives only here (server-only table), so next year it can be changed without a deploy.
create table public.staff_discount (
  id int primary key default 1 check (id = 1),
  code text not null,
  percent int not null check (percent between 1 and 100),
  max_tickets int not null check (max_tickets >= 1)
);
alter table public.staff_discount enable row level security;
insert into public.staff_discount (code, percent, max_tickets) values ('18021927', 50, 2);

alter table public.ticket_types add column staff_discount boolean not null default false;
update public.ticket_types set staff_discount = true where id in ('disz', 'kulon');

-- discount_pct: set on discounted tickets (price is already the discounted one); discount: total Ft off the registration
alter table public.tickets add column discount_pct int check (discount_pct between 1 and 100);
alter table public.registrations add column discount int not null default 0 check (discount >= 0);

-- create_registration: same as 20261026084413_contact_ticket_type, plus the staff discount.
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
  v_contact_type text := payload->>'contactType';
  v_disc_seats jsonb := nullif(payload->'discountSeats', 'null'::jsonb);
  v_pct int := 0;
  v_max int := 0;
  v_disc_n int := 0;
  v_disc boolean;
  v_price int;
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
  -- staff: the code must match; up to max_tickets eligible tickets get percent off
  if v_rel->>'type' = 'munkatars' then
    select s.percent, s.max_tickets into v_pct, v_max from public.staff_discount s where s.code = trim(coalesce(v_rel->>'empCode', ''));
    if not found then raise exception 'BAD_EMP_CODE'; end if;
    if v_disc_seats is not null and (jsonb_typeof(v_disc_seats) <> 'array' or jsonb_array_length(v_disc_seats) > v_max) then
      raise exception 'INVALID_DISCOUNT';
    end if;
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

  -- ticket order must match the client: the contact's chosen type first (contact gets seq 1), then public types by sort
  for tt in select * from public.ticket_types where is_public order by coalesce(id = v_contact_type, false) desc, sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    for i in 1 .. n loop
      v_holder := case when v_seq = 0 then v_contact else v_companions->(v_seq - 1) end;
      -- discountSeats: 0-based seat indexes the staff member picked; without it the first eligible seats get it
      v_disc := v_pct > 0 and tt.staff_discount
        and case when v_disc_seats is null then v_disc_n < v_max else v_disc_seats @> to_jsonb(v_seq) end;
      v_price := public.ticket_price(tt.price, tt.late_price, tt.late_from);
      if v_disc then
        v_price := round(v_price * (100 - v_pct) / 100.0)::int;
        v_disc_n := v_disc_n + 1;
      end if;
      insert into public.tickets (registration_id, seq, ticket_type_id, hall_id, price, holder_name, holder_email, is_contact, discount_pct)
      values (v_reg_id, v_seq + 1, tt.id, tt.hall_id, v_price, trim(v_holder->>'name'), lower(trim(v_holder->>'email')), v_seq = 0,
        case when v_disc then v_pct end);
      v_seq := v_seq + 1;
    end loop;
  end loop;

  -- every picked seat must have been an eligible ticket
  if v_pct > 0 and v_disc_seats is not null
     and v_disc_n <> (select count(distinct x) from jsonb_array_elements(v_disc_seats) x) then
    raise exception 'INVALID_DISCOUNT';
  end if;
  if v_disc_n > 0 then
    update public.registrations
    set total = (select sum(t.price) from public.tickets t where t.registration_id = v_reg_id),
        discount = v_total - (select sum(t.price) from public.tickets t where t.registration_id = v_reg_id)
    where id = v_reg_id;
  end if;

  insert into public.friend_links (registration_id, friend_ref)
  select v_reg_id, c from unnest(v_codes) c where c <> v_ref;

  return v_ref;
end;
$$;

