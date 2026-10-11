-- Ingest real AI-receptionist calls from Nabrah and ElevenLabs into clinic_os_ai_calls,
-- and link the support tickets those calls open.
-- agent_links maps a platform agent to the Madar company that owns it; only the
-- agent-call-webhook function and the backfill script (service role) read it.

create table if not exists public.agent_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('nabrah', 'elevenlabs')),
  agent_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  unique (provider, agent_id)
);

alter table public.agent_links enable row level security;

create index if not exists idx_agent_links_company on public.agent_links (company_id);

alter table public.clinic_os_ai_calls
  add column if not exists provider text,
  add column if not exists external_id text,
  add column if not exists agent_id text,
  add column if not exists channel text,
  add column if not exists caller_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clinic_os_ai_calls_channel_check'
  ) then
    alter table public.clinic_os_ai_calls
      add constraint clinic_os_ai_calls_channel_check check (channel in ('phone', 'web', 'whatsapp'));
  end if;
end $$;

-- Not partial: PostgREST upserts (on_conflict=provider,external_id) cannot target a
-- partial index. NULLs stay distinct, so rows without an external_id never collide.
create unique index if not exists clinic_os_ai_calls_provider_external_id_key
  on public.clinic_os_ai_calls (provider, external_id);

-- Calls that need a person open one support ticket. conversation_id already points at
-- ai_agent_conversations, so the call gets its own link; the unique index keeps webhook
-- retries from opening a second ticket (NULLs, i.e. manual tickets, stay unconstrained).
alter table public.ai_agent_support_tickets
  add column if not exists ai_call_id uuid references public.clinic_os_ai_calls(id) on delete set null;

create unique index if not exists ai_agent_support_tickets_ai_call_id_key
  on public.ai_agent_support_tickets (ai_call_id);

-- The dashboard subscribes to both tables; make sure inserts are broadcast.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['clinic_os_ai_calls', 'ai_agent_support_tickets'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
