-- Table reservations taken by a restaurant's WhatsApp agent. Service-role only; additive.
create table if not exists public.restaurant_reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_key text not null default 'sofias-bistro',
  customer_name text,
  customer_phone text,
  reservation_date date not null,
  reservation_time time not null,
  party_size int not null check (party_size between 1 and 30),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'seated')),
  created_at timestamptz not null default now()
);
create index if not exists idx_restaurant_reservations_day on public.restaurant_reservations (restaurant_key, reservation_date, reservation_time);
alter table public.restaurant_reservations enable row level security;
drop policy if exists restaurant_reservations_service on public.restaurant_reservations;
create policy restaurant_reservations_service on public.restaurant_reservations for all to service_role using (true) with check (true);
