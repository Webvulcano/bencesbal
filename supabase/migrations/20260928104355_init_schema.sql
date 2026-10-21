create table public.halls (
  id text primary key,
  label text not null,
  capacity int not null check (capacity >= 0)
);

create table public.ticket_types (
  id text primary key,
  hall_id text not null references public.halls(id),
  label text not null,
  price int not null check (price >= 0),
  is_public boolean not null default true,
  sort int not null
);

create sequence public.registration_ref_seq start 1;

create table public.registrations (
  id bigint generated always as identity primary key,
  ref text not null unique,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  zip text not null,
  city text not null,
  street text not null,
  house_no text not null,
  floor text,
  relation jsonb not null,
  paper_ticket boolean not null default false,
  consent_at timestamptz not null,
  total int not null,
  created_at timestamptz not null default now()
);

create table public.tickets (
  id bigint generated always as identity primary key,
  registration_id bigint not null references public.registrations(id) on delete cascade,
  seq smallint not null,
  ticket_type_id text not null references public.ticket_types(id),
  hall_id text not null references public.halls(id),
  price int not null,
  holder_name text not null,
  holder_email text not null,
  is_contact boolean not null default false,
  unique (registration_id, seq)
);
create index tickets_registration_idx on public.tickets(registration_id);
create index tickets_hall_idx on public.tickets(hall_id);
create index tickets_type_idx on public.tickets(ticket_type_id);

create table public.friend_links (
  registration_id bigint not null references public.registrations(id) on delete cascade,
  friend_ref text not null,
  primary key (registration_id, friend_ref)
);
create index friend_links_ref_idx on public.friend_links(friend_ref);

-- RLS on, no policies: tables are unreachable from the browser; access only via the functions below.
alter table public.halls enable row level security;
alter table public.ticket_types enable row level security;
alter table public.registrations enable row level security;
alter table public.tickets enable row level security;
alter table public.friend_links enable row level security;

insert into public.halls (id, label, capacity) values
  ('disz', 'Díszterem', 171),
  ('kulon', 'Különterem', 233);

insert into public.ticket_types (id, hall_id, label, price, is_public, sort) values
  ('disz', 'disz', 'Dísztermi jegy', 50000, true, 1),
  ('disz_ezust', 'disz', 'Ezüst támogatói dísztermi jegy', 70000, true, 2),
  ('disz_arany', 'disz', 'Arany támogatói dísztermi jegy', 100000, true, 3),
  ('kulon', 'kulon', 'Különtermi jegy', 40000, true, 4),
  ('kulon_ezust', 'kulon', 'Ezüst támogatói különtermi jegy', 70000, true, 5),
  ('kulon_arany', 'kulon', 'Arany támogatói különtermi jegy', 100000, true, 6),
  ('tisztelet_disz', 'disz', 'Tiszteletjegy — Díszterem', 0, false, 7),
  ('tisztelet_kulon', 'kulon', 'Tiszteletjegy — Különterem', 0, false, 8);

create or replace function public.free_seats()
returns table (hall_id text, label text, capacity int, free int)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.label, h.capacity,
         greatest(h.capacity - count(t.id) filter (where r.status <> 'cancelled'), 0)::int
  from public.halls h
  left join public.tickets t on t.hall_id = h.id
  left join public.registrations r on r.id = t.registration_id
  group by h.id, h.label, h.capacity
  order by h.id;
$$;

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
    v_total := v_total + n * tt.price;
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
    relation, paper_ticket, consent_at, total)
  values (v_ref, trim(v_contact->>'name'), lower(trim(v_contact->>'email')), trim(v_contact->>'phone'),
    trim(v_addr->>'zip'), trim(v_addr->>'city'), trim(v_addr->>'street'), trim(v_addr->>'no'), nullif(trim(v_addr->>'floor'), ''),
    v_rel, coalesce((payload->>'paperTicket')::boolean, false), now(), v_total)
  returning id into v_reg_id;

  -- ticket order must match the client: public types by sort, contact gets seq 1
  for tt in select * from public.ticket_types where is_public order by sort loop
    n := coalesce((v_qty->>tt.id)::int, 0);
    for i in 1 .. n loop
      v_holder := case when v_seq = 0 then v_contact else v_companions->(v_seq - 1) end;
      insert into public.tickets (registration_id, seq, ticket_type_id, hall_id, price, holder_name, holder_email, is_contact)
      values (v_reg_id, v_seq + 1, tt.id, tt.hall_id, tt.price, trim(v_holder->>'name'), lower(trim(v_holder->>'email')), v_seq = 0);
      v_seq := v_seq + 1;
    end loop;
  end loop;

  insert into public.friend_links (registration_id, friend_ref)
  select v_reg_id, c from unnest(v_codes) c where c <> v_ref;

  return v_ref;
end;
$$;

revoke all on function public.free_seats() from public;
revoke all on function public.create_registration(jsonb) from public;
grant execute on function public.free_seats() to anon, authenticated;
grant execute on function public.create_registration(jsonb) to anon, authenticated;
