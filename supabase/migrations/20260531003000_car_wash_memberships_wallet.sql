-- MADAR OS - optional car wash customer memberships and wallets

create table if not exists public.cw_membership_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  washes_per_month integer not null default 4,
  billing_cycle text not null default 'monthly',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cw_customer_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.cw_customers(id) on delete cascade,
  plan_id uuid references public.cw_membership_plans(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','cancelled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  remaining_washes integer not null default 0,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cw_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.cw_customers(id) on delete cascade,
  amount numeric not null,
  type text not null default 'charge' check (type in ('charge','debit','refund','adjustment')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.cw_customers
  add column if not exists wallet_balance numeric not null default 0,
  add column if not exists membership_status text,
  add column if not exists membership_plan_id uuid references public.cw_membership_plans(id) on delete set null;

create index if not exists cw_membership_plans_company_idx on public.cw_membership_plans(company_id, active);
create index if not exists cw_customer_memberships_company_idx on public.cw_customer_memberships(company_id, status, ends_at);
create index if not exists cw_wallet_transactions_company_idx on public.cw_wallet_transactions(company_id, created_at desc);

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.get_my_company()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.companies where auth_user_id = auth.uid() limit 1
$$;

grant execute on function public.get_my_company() to authenticated;
grant execute on function public.get_my_role() to authenticated;

alter table public.cw_membership_plans enable row level security;
alter table public.cw_customer_memberships enable row level security;
alter table public.cw_wallet_transactions enable row level security;

drop policy if exists "cw_membership_plans_company_select" on public.cw_membership_plans;
drop policy if exists "cw_membership_plans_company_write" on public.cw_membership_plans;
drop policy if exists "cw_customer_memberships_company_select" on public.cw_customer_memberships;
drop policy if exists "cw_customer_memberships_company_write" on public.cw_customer_memberships;
drop policy if exists "cw_wallet_transactions_company_select" on public.cw_wallet_transactions;
drop policy if exists "cw_wallet_transactions_company_write" on public.cw_wallet_transactions;

create policy "cw_membership_plans_company_select" on public.cw_membership_plans
  for select to authenticated
  using (public.get_my_role() = 'admin' or company_id = public.get_my_company());
create policy "cw_membership_plans_company_write" on public.cw_membership_plans
  for all to authenticated
  using (public.get_my_role() = 'admin' or company_id = public.get_my_company())
  with check (public.get_my_role() = 'admin' or company_id = public.get_my_company());

create policy "cw_customer_memberships_company_select" on public.cw_customer_memberships
  for select to authenticated
  using (public.get_my_role() = 'admin' or company_id = public.get_my_company());
create policy "cw_customer_memberships_company_write" on public.cw_customer_memberships
  for all to authenticated
  using (public.get_my_role() = 'admin' or company_id = public.get_my_company())
  with check (public.get_my_role() = 'admin' or company_id = public.get_my_company());

create policy "cw_wallet_transactions_company_select" on public.cw_wallet_transactions
  for select to authenticated
  using (public.get_my_role() = 'admin' or company_id = public.get_my_company());
create policy "cw_wallet_transactions_company_write" on public.cw_wallet_transactions
  for all to authenticated
  using (public.get_my_role() = 'admin' or company_id = public.get_my_company())
  with check (public.get_my_role() = 'admin' or company_id = public.get_my_company());

grant select, insert, update, delete on public.cw_membership_plans to authenticated;
grant select, insert, update, delete on public.cw_customer_memberships to authenticated;
grant select, insert, update, delete on public.cw_wallet_transactions to authenticated;
