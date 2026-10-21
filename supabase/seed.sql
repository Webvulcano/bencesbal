-- Local-only test data (runs after migrations on `supabase db reset` / first `start`).
-- Goes through create_registration so it hits the same validation as the public form.
-- All addresses are @example.com, so no real email can be sent by accident.
select public.create_registration('{
  "consent": true,
  "contact": {"name": "Teszt Anna", "email": "anna@example.com", "phone": "+36 30 111 1111"},
  "address": {"zip": "9021", "city": "Győr", "street": "Széchenyi tér", "no": "8"},
  "relation": {"type": "oregdiak"},
  "qty": {"disz_arany": 2},
  "companions": [{"name": "Teszt Béla", "email": "bela@example.com"}],
  "seatingNote": "Kovácsékkal egy asztalhoz"
}'::jsonb);

select public.create_registration('{
  "consent": true,
  "contact": {"name": "Teszt Csaba", "email": "csaba@example.com", "phone": "+36 30 222 2222"},
  "address": {"zip": "9022", "city": "Győr", "street": "Bajcsy-Zsilinszky út", "no": "12", "floor": "2/5"},
  "relation": {"type": "szulo"},
  "qty": {"kulon": 1},
  "companions": [],
  "paperTicket": true
}'::jsonb);

select public.create_registration('{
  "consent": true,
  "contact": {"name": "Teszt Dóra", "email": "dora@example.com", "phone": "+36 30 333 3333"},
  "address": {"zip": "1051", "city": "Budapest", "street": "Nádor utca", "no": "3"},
  "relation": {"type": "tamogato"},
  "qty": {"disz": 2, "disz_ezust": 1},
  "companions": [{"name": "Teszt Ede", "email": "ede@example.com"}, {"name": "Teszt Fanni", "email": "fanni@example.com"}],
  "friendCodes": ["GYBB-0001"]
}'::jsonb);
