-- ============================================================
-- MADAR AI SYSTEM — Supabase Database Setup
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Companies (tenants)
create table if not exists public.companies (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  industry          text not null,
  plan              text not null default 'starter' check (plan in ('starter','growth','enterprise')),
  status            text not null default 'trial' check (status in ('active','suspended','trial')),
  owner_name        text not null,
  owner_email       text not null,
  owner_phone       text,
  monthly_messages  int  not null default 0,
  monthly_leads     int  not null default 0,
  automations_count int  not null default 0,
  created_at        timestamptz not null default now()
);

-- Users (extends auth.users)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'client' check (role in ('admin','client')),
  company_id  uuid references public.companies(id),
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Automations
create table if not exists public.automations (
  id                   uuid primary key default uuid_generate_v4(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  name                 text not null,
  type                 text not null check (type in ('whatsapp','crm','ai_agent','booking','sales')),
  status               text not null default 'building' check (status in ('active','paused','error','building')),
  messages_today       int  not null default 0,
  messages_month       int  not null default 0,
  leads_generated      int  not null default 0,
  response_rate        int  not null default 0,
  avg_response_time    int  not null default 0,
  last_active          timestamptz,
  created_at           timestamptz not null default now()
);

-- Leads
create table if not exists public.leads (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  automation_id uuid references public.automations(id),
  name          text not null,
  phone         text not null,
  email         text,
  source        text not null default 'واتساب',
  status        text not null default 'new' check (status in ('new','contacted','qualified','converted','lost')),
  value         numeric,
  notes         text,
  last_contact  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Logs
create table if not exists public.logs (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid references public.companies(id),
  automation_id uuid references public.automations(id),
  level         text not null check (level in ('info','warning','error','success')),
  event         text not null,
  message       text not null,
  meta          jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 3. VIEWS (for stats)
-- ============================================================

create or replace view public.admin_stats as
select
  (select count(*) from public.companies)                               as total_companies,
  (select count(*) from public.automations where status = 'active')     as active_automations,
  (select count(*) from public.leads)                                   as total_leads,
  (select coalesce(sum(messages_today),0) from public.automations)      as messages_today,
  0::numeric                                                             as revenue_month,
  0                                                                      as growth_pct;

create or replace view public.client_stats as
select
  company_id,
  count(*) filter (where status = 'active')             as active_automations,
  0                                                       as total_leads,
  coalesce(sum(messages_today),0)                         as messages_today,
  coalesce(avg(response_rate)::int, 0)                   as response_rate,
  0                                                       as leads_this_week,
  0                                                       as conversion_rate
from public.automations
group by company_id;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.companies  enable row level security;
alter table public.users      enable row level security;
alter table public.automations enable row level security;
alter table public.leads      enable row level security;
alter table public.logs       enable row level security;

-- Helper function: get current user role
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.users where id = auth.uid()
$$;

-- Helper function: get current user company_id
create or replace function public.get_my_company()
returns uuid language sql security definer stable as $$
  select company_id from public.users where id = auth.uid()
$$;

-- Companies: admins see all, clients see their own
create policy "companies_select" on public.companies for select using (
  public.get_my_role() = 'admin' or id = public.get_my_company()
);
create policy "companies_admin_all" on public.companies for all using (
  public.get_my_role() = 'admin'
);

-- Users: admins see all, users see themselves
create policy "users_select_self" on public.users for select using (
  public.get_my_role() = 'admin' or id = auth.uid()
);
create policy "users_update_self" on public.users for update using (id = auth.uid());
create policy "users_insert" on public.users for insert with check (id = auth.uid());

-- Automations: admins see all, clients see own company
create policy "automations_select" on public.automations for select using (
  public.get_my_role() = 'admin' or company_id = public.get_my_company()
);
create policy "automations_update" on public.automations for update using (
  public.get_my_role() = 'admin' or company_id = public.get_my_company()
);
create policy "automations_admin_insert" on public.automations for insert with check (
  public.get_my_role() = 'admin'
);

-- Leads: admins see all, clients see own company
create policy "leads_select" on public.leads for select using (
  public.get_my_role() = 'admin' or company_id = public.get_my_company()
);
create policy "leads_update" on public.leads for update using (
  public.get_my_role() = 'admin' or company_id = public.get_my_company()
);
create policy "leads_insert" on public.leads for insert with check (
  public.get_my_role() = 'admin' or company_id = public.get_my_company()
);

-- Logs: admins see all, clients see own
create policy "logs_select" on public.logs for select using (
  public.get_my_role() = 'admin' or company_id = public.get_my_company()
);
create policy "logs_insert" on public.logs for insert with check (true);

-- ============================================================
-- 5. AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 6. SEED DATA (optional — for testing)
-- ============================================================

-- Admin user (set after creating via Supabase Auth)
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@madar.ai';
