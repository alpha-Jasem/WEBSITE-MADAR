-- Customer segments and WhatsApp campaigns (one-off sends and multi-step journeys). Additive only.
--   * customer_segments: saved conditions (dynamic) or a fixed list of phone keys (static).
--   * client_campaigns (the agency already has its own "campaigns" table): who gets it (fixed when scheduled), the template steps, the schedule and status.
--   * outreach_messages gains campaign_id and step, so each send is tied to its campaign.
--   * campaigns-runner (edge function) sends due steps every 5 minutes.

create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  kind text not null default 'dynamic' check (kind in ('dynamic', 'static')),
  rules jsonb not null default '{"match":"all","groups":[]}'::jsonb,
  member_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customer_segments_company on public.customer_segments (company_id);

alter table public.customer_segments enable row level security;
drop policy if exists customer_segments_company on public.customer_segments;
create policy customer_segments_company on public.customer_segments for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());
drop policy if exists customer_segments_service on public.customer_segments;
create policy customer_segments_service on public.customer_segments for all to service_role using (true) with check (true);

create table if not exists public.client_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'once' check (kind in ('once', 'journey')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'paused', 'done', 'cancelled')),
  segment_ids uuid[] not null default '{}',
  -- [{ key, phone, name }]
  recipients jsonb not null default '[]'::jsonb,
  -- [{ template_id, params: [..], delay_days }]
  steps jsonb not null default '[]'::jsonb,
  stop_on_reply boolean not null default false,
  scheduled_at timestamptz,
  finished_at timestamptz,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_client_campaigns_company on public.client_campaigns (company_id, created_at desc);
create index if not exists idx_client_campaigns_due on public.client_campaigns (status, scheduled_at) where status in ('scheduled', 'running');

alter table public.client_campaigns enable row level security;
drop policy if exists client_campaigns_company on public.client_campaigns;
create policy client_campaigns_company on public.client_campaigns for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());
drop policy if exists client_campaigns_service on public.client_campaigns;
create policy client_campaigns_service on public.client_campaigns for all to service_role using (true) with check (true);

alter table public.outreach_messages
  add column if not exists campaign_id uuid references public.client_campaigns(id) on delete set null,
  add column if not exists step integer;
create index if not exists idx_outreach_messages_campaign on public.outreach_messages (campaign_id, step) where campaign_id is not null;

do $$ begin
  perform cron.unschedule('campaigns-sweep');
exception when others then null; end $$;
select cron.schedule('campaigns-sweep', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/campaigns-runner',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-runner-secret', (select value from public.connect_config where key = 'runner_secret')),
    body := '{}'::jsonb);
$cron$);
