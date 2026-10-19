-- WhatsApp Web bridge: a Chrome extension on the owner's computer sends the agent's messages and reads replies.
-- The browser never talks to these tables directly except the owner's dashboard (admin only).

create table if not exists public.wa_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,              -- master switch: nothing is sent while false
  send_outbound boolean not null default true,         -- first messages to new leads
  auto_reply boolean not null default true,            -- replies in conversations the agent started
  start_hour int not null default 9 check (start_hour between 0 and 23),
  end_hour int not null default 22 check (end_hour between 1 and 24),
  ramp_start int not null default 15 check (ramp_start >= 1),
  ramp_step int not null default 5 check (ramp_step >= 0),
  ramp_every_days int not null default 2 check (ramp_every_days >= 1),
  max_cap int not null default 120 check (max_cap between 1 and 500),
  min_delay_s int not null default 60 check (min_delay_s >= 15),
  max_delay_s int not null default 180,
  reply_cap int not null default 200,
  agent_id uuid references public.sales_agents(id) on delete set null,
  target text not null default 'outreach' check (target in ('outreach', 'no_website')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  started_on date,
  pause_reason text,
  updated_at timestamptz not null default now(),
  check (max_delay_s >= min_delay_s)
);
insert into public.wa_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.wa_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Chrome',
  token_hash text not null unique,
  last_seen_at timestamptz,
  last_status text,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wa_conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outreach_leads(id) on delete set null,
  phone text not null unique,
  state text not null default 'active' check (state in ('active', 'paused', 'stopped', 'escalated', 'done')),
  last_in_at timestamptz,
  last_out_at timestamptz,
  auto_replies int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.wa_conversations(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'received')),
  kind text not null default 'reply' check (kind in ('first', 'reply')),
  draft_id uuid,
  fingerprint text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists wa_messages_conv_idx on public.wa_messages (conversation_id, created_at);
create index if not exists wa_messages_queue_idx on public.wa_messages (status, direction) where status = 'queued';
create unique index if not exists wa_messages_in_fp on public.wa_messages (conversation_id, fingerprint) where direction = 'in' and fingerprint is not null;

alter table public.wa_settings enable row level security;
alter table public.wa_devices enable row level security;
alter table public.wa_conversations enable row level security;
alter table public.wa_messages enable row level security;
drop policy if exists wa_settings_admin on public.wa_settings;
drop policy if exists wa_devices_admin on public.wa_devices;
drop policy if exists wa_conversations_admin on public.wa_conversations;
drop policy if exists wa_messages_admin on public.wa_messages;
create policy wa_settings_admin on public.wa_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy wa_devices_admin on public.wa_devices for select to authenticated using (public.is_admin());
create policy wa_conversations_admin on public.wa_conversations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy wa_messages_admin on public.wa_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- live updates for the dashboard page
do $$
declare t text;
begin
  foreach t in array array['wa_settings', 'wa_conversations', 'wa_messages', 'wa_devices'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
