-- Client update 2026-10-13: gold tickets 80 000 Ft, hall counters: disz 171 -> 150, kulon 233 -> 180 (will likely be raised later).
update public.ticket_types set price = 80000 where id in ('disz_arany', 'kulon_arany');

update public.halls set capacity = 150 where id = 'disz';
update public.halls set capacity = 180 where id = 'kulon';
