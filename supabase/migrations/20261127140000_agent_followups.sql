-- WhatsApp follow-ups after a voice call: per agent, a Meta-approved template sent when the call's
-- analysis matches. The voice platform calls the nabrah-followup function once the analysis is done;
-- that function (service role) is the only writer of agent_followup_sends.
create table if not exists public.agent_followups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_id text not null check (length(agent_id) between 8 and 64),
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  template_id uuid not null references public.whatsapp_templates(id) on delete cascade,
  -- One value per template placeholder; may hold tokens such as {{call.from}} or {{analysis.x}}.
  params jsonb not null default '[]'::jsonb,
  -- 'customer' (the number on the other end of the call) or a fixed number in digits.
  recipient text not null default 'customer' check (recipient = 'customer' or recipient ~ '^[0-9]{8,15}$'),
  -- Analysis fields that must all be true. Empty: send after every analysed call.
  conditions text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agent_followups_agent on public.agent_followups (agent_id) where enabled;
alter table public.agent_followups enable row level security;
drop policy if exists agent_followups_company on public.agent_followups;
create policy agent_followups_company on public.agent_followups for all to authenticated
  using (company_id = public.get_my_clinic_company_id()) with check (company_id = public.get_my_clinic_company_id());
drop policy if exists agent_followups_service on public.agent_followups;
create policy agent_followups_service on public.agent_followups for all to service_role using (true) with check (true);

create table if not exists public.agent_followup_sends (
  id uuid primary key default gen_random_uuid(),
  followup_id uuid not null references public.agent_followups(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  call_id text not null,
  to_phone text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now(),
  unique (followup_id, call_id)
);
create index if not exists idx_agent_followup_sends_company on public.agent_followup_sends (company_id, created_at desc);
alter table public.agent_followup_sends enable row level security;
drop policy if exists agent_followup_sends_read on public.agent_followup_sends;
create policy agent_followup_sends_read on public.agent_followup_sends for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
drop policy if exists agent_followup_sends_service on public.agent_followup_sends;
create policy agent_followup_sends_service on public.agent_followup_sends for all to service_role using (true) with check (true);
