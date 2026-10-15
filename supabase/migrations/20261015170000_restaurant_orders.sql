-- Orders taken by a restaurant's WhatsApp agent (first client: Sofia's Bistro). Service-role only; additive.
create table if not exists public.restaurant_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_key text not null default 'sofias-bistro',
  customer_name text,
  customer_phone text,
  order_type text not null default 'pickup' check (order_type in ('pickup', 'delivery', 'dine_in')),
  address text,
  items jsonb not null default '[]'::jsonb,
  notes text,
  total numeric(10, 2) not null default 0,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled')),
  payment_link text,
  created_at timestamptz not null default now()
);
create index if not exists idx_restaurant_orders_key on public.restaurant_orders (restaurant_key, created_at desc);
alter table public.restaurant_orders enable row level security;
drop policy if exists restaurant_orders_service on public.restaurant_orders;
create policy restaurant_orders_service on public.restaurant_orders for all to service_role using (true) with check (true);
