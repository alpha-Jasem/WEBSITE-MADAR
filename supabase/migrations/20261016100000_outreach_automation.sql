-- Outreach automation: LinkedIn source, daily auto-fetch settings, push subscriptions.
alter table public.outreach_runs
  add column if not exists stage text not null default 'main',
  add column if not exists second_run_id text,
  add column if not exists second_dataset_id text,
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists trigger text not null default 'manual',
  add column if not exists notified boolean not null default false;

alter table public.outreach_runs drop constraint if exists outreach_runs_status_check;
alter table public.outreach_runs add constraint outreach_runs_status_check check (status in ('running','done','failed'));

create table if not exists public.outreach_settings (
  id int primary key default 1 check (id = 1),
  daily_enabled boolean not null default false,
  daily_source text not null default 'google_maps' check (daily_source in ('google_maps','linkedin','both')),
  daily_query text not null default 'dental clinic',
  daily_city text not null default 'Jeddah',
  daily_count int not null default 200 check (daily_count between 10 and 500),
  digest_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.outreach_settings (id) values (1) on conflict do nothing;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

alter table public.outreach_settings enable row level security;
alter table public.push_subscriptions enable row level security;

create policy outreach_settings_admin on public.outreach_settings for all
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy push_subscriptions_own_admin on public.push_subscriptions for all
  using (user_id = auth.uid() and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (user_id = auth.uid() and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
