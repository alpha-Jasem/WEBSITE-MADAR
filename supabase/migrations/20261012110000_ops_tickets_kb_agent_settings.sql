-- Tickets, knowledge base and agent settings for the client dashboard (Night).
-- Additive only. The dashboard probes for every column/table below and hides the
-- matching controls until this migration is applied.
-- Depends on 20261012090000_agent_call_ingestion.sql (agent_links, ai_call_id).

-- ─── Tickets: owner, customer, type, due time ──────────────────────────────────

alter table public.ai_agent_support_tickets
  add column if not exists assignee_user_id uuid,
  add column if not exists assignee_name text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists ticket_type text,
  add column if not exists due_at timestamptz;

create index if not exists idx_support_tickets_company_status
  on public.ai_agent_support_tickets (company_id, status, created_at desc);

-- Clinic users could read and update their tickets but not open one from the dashboard.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_agent_support_tickets'
      and policyname = 'clinic_tickets_own_company_insert'
  ) then
    create policy clinic_tickets_own_company_insert on public.ai_agent_support_tickets
      for insert to authenticated
      with check (company_id = public.get_my_clinic_company_id());
  end if;
end $$;

-- ─── Ticket timeline: internal notes, status and owner changes ────────────────

create table if not exists public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.ai_agent_support_tickets(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'status', 'assign')),
  body text not null,
  author_user_id uuid default auth.uid(),
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_notes_ticket on public.ticket_notes (ticket_id, created_at);
create index if not exists idx_ticket_notes_company on public.ticket_notes (company_id);

alter table public.ticket_notes enable row level security;

drop policy if exists ticket_notes_own_company_read on public.ticket_notes;
create policy ticket_notes_own_company_read on public.ticket_notes
  for select to authenticated
  using (company_id = public.get_my_clinic_company_id());

drop policy if exists ticket_notes_own_company_insert on public.ticket_notes;
create policy ticket_notes_own_company_insert on public.ticket_notes
  for insert to authenticated
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists ticket_notes_service_all on public.ticket_notes;
create policy ticket_notes_service_all on public.ticket_notes
  for all to service_role using (true) with check (true);

-- ─── Questions the agent could not answer ──────────────────────────────────────
-- Filled by the call ingestion side (later step); answered from the knowledge base page.

create table if not exists public.agent_unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  question text not null,
  count integer not null default 1,
  last_asked_at timestamptz not null default now(),
  answered_at timestamptz,
  knowledge_item_id uuid references public.clinic_os_knowledge_items(id) on delete set null,
  ai_call_id uuid references public.clinic_os_ai_calls(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists agent_unanswered_questions_company_question_key
  on public.agent_unanswered_questions (company_id, lower(question));
create index if not exists idx_agent_unanswered_pending
  on public.agent_unanswered_questions (company_id, last_asked_at desc) where answered_at is null;

alter table public.agent_unanswered_questions enable row level security;

drop policy if exists agent_unanswered_own_company on public.agent_unanswered_questions;
create policy agent_unanswered_own_company on public.agent_unanswered_questions
  for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists agent_unanswered_service_all on public.agent_unanswered_questions;
create policy agent_unanswered_service_all on public.agent_unanswered_questions
  for all to service_role using (true) with check (true);

-- ─── Agent settings (one row per company) ──────────────────────────────────────
-- Stored only; pushing them to Nabrah/ElevenLabs is a later step.

create table if not exists public.agent_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  agent_name text,
  voice_label text,
  greeting text,
  transfer_number text,
  channels jsonb not null default '{"phone": true, "whatsapp": true, "web": true}'::jsonb,
  working_hours jsonb not null default '[]'::jsonb,
  after_hours_mode text not null default 'take' check (after_hours_mode in ('take', 'message')),
  paused boolean not null default false,
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_settings enable row level security;

drop policy if exists agent_settings_own_company_read on public.agent_settings;
create policy agent_settings_own_company_read on public.agent_settings
  for select to authenticated
  using (company_id = public.get_my_clinic_company_id());

drop policy if exists agent_settings_own_company_insert on public.agent_settings;
create policy agent_settings_own_company_insert on public.agent_settings
  for insert to authenticated
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists agent_settings_own_company_update on public.agent_settings;
create policy agent_settings_own_company_update on public.agent_settings
  for update to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists agent_settings_service_all on public.agent_settings;
create policy agent_settings_service_all on public.agent_settings
  for all to service_role using (true) with check (true);

-- ─── Let a company see its own linked agents (for the "try a call" button) ────
-- Agent ids are public identifiers (the web widget embeds them); secrets stay in env.

do $$
begin
  if to_regclass('public.agent_links') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agent_links' and policyname = 'agent_links_own_company_read'
  ) then
    create policy agent_links_own_company_read on public.agent_links
      for select to authenticated
      using (company_id = public.get_my_clinic_company_id());
  end if;
end $$;

-- ─── Realtime ──────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['ticket_notes', 'agent_unanswered_questions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
