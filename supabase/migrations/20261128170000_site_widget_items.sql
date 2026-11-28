-- Widgets (الإضافات): a company can have many web-call widgets and many chat widgets, each with its own
-- public key, agent, allowed websites and look (config). The older one-row-per-company site_widgets
-- table keeps working for snippets already installed. Additive only.

create table if not exists public.site_widget_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('call', 'chat')),
  name text not null,
  public_key uuid not null unique default gen_random_uuid(),
  enabled boolean not null default true,
  agent_id text,
  allowed_origins text[] not null default '{}',
  direct_link boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_widget_items_company_idx on public.site_widget_items (company_id, kind, created_at desc);

alter table public.site_widget_items enable row level security;

drop policy if exists site_widget_items_own_company_all on public.site_widget_items;
create policy site_widget_items_own_company_all on public.site_widget_items
  for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists site_widget_items_service_all on public.site_widget_items;
create policy site_widget_items_service_all on public.site_widget_items
  for all to service_role using (true) with check (true);
