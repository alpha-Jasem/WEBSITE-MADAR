-- Outreach: leads fetched on demand (Google Maps etc.) for the admin to call / WhatsApp.
create table if not exists public.outreach_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'google_maps',
  query text not null,
  city text not null default '',
  requested int not null default 200,
  apify_run_id text,
  dataset_id text,
  status text not null default 'running' check (status in ('running','done','failed')),
  found int not null default 0,
  added int not null default 0,
  imported boolean not null default false,
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_leads (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.outreach_runs(id) on delete set null,
  name text not null,
  phone text not null,
  is_mobile boolean not null default false,
  website text not null default '',
  address text not null default '',
  city text not null default '',
  category text not null default '',
  rating numeric,
  reviews int,
  source text not null default 'google_maps',
  source_url text not null default '',
  status text not null default 'new' check (status in ('new','contacted','replied','meeting','won','lost','no_answer')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists outreach_leads_phone_key on public.outreach_leads(phone);
create index if not exists outreach_leads_status_idx on public.outreach_leads(status);
create index if not exists outreach_leads_created_idx on public.outreach_leads(created_at desc);

alter table public.outreach_runs enable row level security;
alter table public.outreach_leads enable row level security;

create policy outreach_runs_admin on public.outreach_runs for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy outreach_leads_admin on public.outreach_leads for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
