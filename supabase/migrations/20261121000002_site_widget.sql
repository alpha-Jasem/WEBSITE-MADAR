-- Website chat widget: per-company settings (owner edits from the dashboard) and a small hit log
-- used only by the public chat function for rate limiting. Additive only.

create table if not exists public.site_widgets (
  company_id uuid primary key references public.companies(id) on delete cascade,
  public_key uuid not null unique default gen_random_uuid(),
  enabled boolean not null default false,
  title text not null default 'تحدث معنا',
  greeting text not null default 'أهلًا بك! كيف أقدر أساعدك؟',
  color text not null default '#4f6bff',
  position text not null default 'right' check (position in ('right', 'left')),
  logo_url text,
  chips jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_widgets enable row level security;

drop policy if exists site_widgets_own_company_all on public.site_widgets;
create policy site_widgets_own_company_all on public.site_widgets
  for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists site_widgets_service_all on public.site_widgets;
create policy site_widgets_service_all on public.site_widgets
  for all to service_role using (true) with check (true);

create table if not exists public.site_chat_hits (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists site_chat_hits_ip_idx on public.site_chat_hits (ip_hash, created_at desc);
create index if not exists site_chat_hits_company_idx on public.site_chat_hits (company_id, created_at desc);
alter table public.site_chat_hits enable row level security;
-- no policies: only the service role (the public chat function) can read or write it
