-- Voice-agent configuration lists: HTTP tools, call-analysis groups, inbound/outbound call services.
-- NOT applied yet: run only after review. Every table is limited to the signed-in user's own company.

create table if not exists public.agent_tools (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (name ~ '^[a-z][a-z0-9_]{1,39}$'),
  description text not null default '' check (length(description) <= 500),
  method text not null default 'GET' check (method in ('GET', 'POST', 'PUT', 'DELETE')),
  url text not null check (url ~ '^https://' and length(url) <= 500),
  params jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.analysis_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  description text,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  phone text not null check (length(trim(phone)) > 0 and length(phone) <= 30),
  provider text not null default '' check (length(provider) <= 80),
  status text not null default 'pending' check (status in ('pending', 'active', 'paused')),
  notes text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['agent_tools', 'analysis_groups', 'voice_services'] loop
    execute format('create index if not exists %I on public.%I (company_id, created_at)', 'idx_' || t || '_company', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_company', t);
    execute format('create policy %I on public.%I for all to authenticated using (company_id = public.get_my_clinic_company_id()) with check (company_id = public.get_my_clinic_company_id())', t || '_company', t);
    execute format('drop policy if exists %I on public.%I', t || '_service', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service', t);
  end loop;
end $$;
