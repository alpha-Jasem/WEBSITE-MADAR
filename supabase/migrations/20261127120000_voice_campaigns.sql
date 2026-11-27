-- Outbound call campaigns: a named list of numbers one voice agent calls from one outbound number.
-- The dashboard saves drafts; only the nabrah-call function launches one (sets status, tag and call_ids).
create table if not exists public.voice_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  agent_id text not null check (length(agent_id) between 8 and 64),
  call_from text not null check (length(trim(call_from)) > 0 and length(call_from) <= 30),
  numbers text[] not null default '{}' check (cardinality(numbers) between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'launching', 'launched', 'failed')),
  tag text,
  call_ids text[] not null default '{}',
  error text,
  launched_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_voice_campaigns_company on public.voice_campaigns (company_id, created_at);
alter table public.voice_campaigns enable row level security;
drop policy if exists voice_campaigns_company on public.voice_campaigns;
create policy voice_campaigns_company on public.voice_campaigns for all to authenticated
  using (company_id = public.get_my_clinic_company_id()) with check (company_id = public.get_my_clinic_company_id());
drop policy if exists voice_campaigns_service on public.voice_campaigns;
create policy voice_campaigns_service on public.voice_campaigns for all to service_role using (true) with check (true);
