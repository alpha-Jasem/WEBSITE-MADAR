-- Connect rules: "when X happens, do Y" connections between Madar and other systems. Additive only.
-- Events are queued by triggers; the connect-runner edge function matches them to rules and runs the actions.

create table if not exists public.connect_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  trigger_event text not null check (trigger_event in (
    'conversation.new', 'conversation.needs_review', 'conversation.transferred',
    'ticket.created', 'booking.created', 'customer.created', 'review.new')),
  conditions jsonb not null default '{}'::jsonb,
  action_type text not null check (action_type in ('webhook', 'transfer', 'ticket', 'whatsapp', 'notify')),
  action_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  run_count int not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_connect_rules_company on public.connect_rules (company_id, trigger_event) where enabled;

create table if not exists public.connect_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_connect_events_pending on public.connect_events (created_at) where processed_at is null;

create table if not exists public.connect_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rule_id uuid references public.connect_rules(id) on delete cascade,
  event text,
  status text not null check (status in ('ok', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists idx_connect_runs_company on public.connect_runs (company_id, created_at desc);

-- The runner secret lives in a table no client can read (RLS on, no policies); triggers and cron read it as the owner.
create table if not exists public.connect_config (key text primary key, value text not null);
alter table public.connect_config enable row level security;

alter table public.connect_rules enable row level security;
alter table public.connect_events enable row level security;
alter table public.connect_runs enable row level security;

drop policy if exists connect_rules_read on public.connect_rules;
create policy connect_rules_read on public.connect_rules for select to authenticated using (company_id = public.get_my_clinic_company_id());
drop policy if exists connect_rules_owner_write on public.connect_rules;
create policy connect_rules_owner_write on public.connect_rules for all to authenticated
  using (company_id in (select id from public.companies where auth_user_id = auth.uid()))
  with check (company_id in (select id from public.companies where auth_user_id = auth.uid()));
drop policy if exists connect_rules_service on public.connect_rules;
create policy connect_rules_service on public.connect_rules for all to service_role using (true) with check (true);

drop policy if exists connect_runs_read on public.connect_runs;
create policy connect_runs_read on public.connect_runs for select to authenticated using (company_id = public.get_my_clinic_company_id());
drop policy if exists connect_runs_service on public.connect_runs;
create policy connect_runs_service on public.connect_runs for all to service_role using (true) with check (true);

drop policy if exists connect_events_service on public.connect_events;
create policy connect_events_service on public.connect_events for all to service_role using (true) with check (true);

-- Queue an event, only when the company has an enabled rule for it, and nudge the runner right away.
create or replace function public.queue_connect_event(p_company uuid, p_event text, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_company is null then return; end if;
  if not exists (select 1 from public.connect_rules where company_id = p_company and trigger_event = p_event and enabled) then return; end if;
  insert into public.connect_events (company_id, event, payload) values (p_company, p_event, p_payload) returning id into v_id;
  begin
    perform net.http_post(
      url := 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/connect-runner',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-runner-secret', (select value from public.connect_config where key = 'runner_secret')),
      body := jsonb_build_object('event_id', v_id)
    );
  exception when others then null;  -- the one-minute sweep picks it up
  end;
end $$;

create or replace function public.connect_on_call() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'INSERT' then
      perform public.queue_connect_event(new.company_id, 'conversation.new', jsonb_build_object(
        'conversation', jsonb_build_object('id', new.id, 'key', case when new.channel = 'whatsapp' and new.phone is not null then 'chat:' || regexp_replace(new.phone, '\D', '', 'g') else 'call:' || new.id end,
          'phone', new.phone, 'name', new.caller_name, 'channel', new.channel, 'summary', new.summary, 'intent', new.intent, 'needs_review', new.needs_review)));
    end if;
    if new.needs_review is true and (tg_op = 'INSERT' or old.needs_review is distinct from true) then
      perform public.queue_connect_event(new.company_id, 'conversation.needs_review', jsonb_build_object(
        'conversation', jsonb_build_object('id', new.id, 'key', case when new.channel = 'whatsapp' and new.phone is not null then 'chat:' || regexp_replace(new.phone, '\D', '', 'g') else 'call:' || new.id end,
          'phone', new.phone, 'name', new.caller_name, 'channel', new.channel, 'summary', new.summary, 'reason', new.review_reason)));
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_connect_call on public.clinic_os_ai_calls;
create trigger trg_connect_call after insert or update of needs_review on public.clinic_os_ai_calls
  for each row execute function public.connect_on_call();

create or replace function public.connect_on_ticket() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.queue_connect_event(new.company_id, 'ticket.created', jsonb_build_object(
      'ticket', jsonb_build_object('id', new.id, 'subject', new.subject, 'description', new.description, 'priority', new.priority, 'status', new.status),
      'customer', jsonb_build_object('name', new.customer_name, 'phone', new.customer_phone)));
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_connect_ticket on public.ai_agent_support_tickets;
create trigger trg_connect_ticket after insert on public.ai_agent_support_tickets
  for each row execute function public.connect_on_ticket();

create or replace function public.connect_on_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.queue_connect_event(new.company_id, 'booking.created', jsonb_build_object(
      'booking', jsonb_build_object('id', new.id, 'date', new.appointment_date, 'time', new.start_time, 'service', new.service_name, 'status', new.status, 'source', new.source),
      'customer', jsonb_build_object('name', new.patient_name, 'phone', new.patient_phone)));
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_connect_booking on public.clinic_os_appointments;
create trigger trg_connect_booking after insert on public.clinic_os_appointments
  for each row execute function public.connect_on_booking();

create or replace function public.connect_on_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.queue_connect_event(new.company_id, 'customer.created', jsonb_build_object('customer', jsonb_build_object('id', new.id, 'name', new.name, 'phone', new.phone)));
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_connect_customer on public.clinic_os_patients;
create trigger trg_connect_customer after insert on public.clinic_os_patients
  for each row execute function public.connect_on_customer();

create or replace function public.connect_on_transfer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'transfer' then
    begin
      perform public.queue_connect_event(new.company_id, 'conversation.transferred', jsonb_build_object(
        'conversation', jsonb_build_object('key', new.conversation_key),
        'transfer', jsonb_build_object('team', new.team_name, 'assignee', new.assignee_name, 'reason', new.body, 'by', new.author_name)));
    exception when others then null;
    end;
  end if;
  return new;
end $$;
drop trigger if exists trg_connect_transfer on public.conversation_events;
create trigger trg_connect_transfer after insert on public.conversation_events
  for each row execute function public.connect_on_transfer();

-- Safety net: every minute, hand any unprocessed events to the runner.
do $$ begin
  perform cron.unschedule('connect-sweep');
exception when others then null; end $$;
select cron.schedule('connect-sweep', '* * * * *', $cron$
  select net.http_post(
    url := 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/connect-runner',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-runner-secret', (select value from public.connect_config where key = 'runner_secret')),
    body := '{"sweep":true}'::jsonb)
  where exists (select 1 from public.connect_events where processed_at is null and created_at < now() - interval '20 seconds');
$cron$);
