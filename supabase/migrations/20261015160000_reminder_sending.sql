-- Reminders that actually send: each WhatsApp rule picks an approved template and how to fill it, a log makes
-- sure one appointment gets each reminder only once, and a cron job runs the reminders-runner function.
-- Additive only.

alter table public.clinic_os_reminder_rules add column if not exists template_id uuid references public.whatsapp_templates(id) on delete set null;
alter table public.clinic_os_reminder_rules add column if not exists params jsonb not null default '[]'::jsonb;

create table if not exists public.reminder_sends (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  appointment_id uuid not null references public.clinic_os_appointments(id) on delete cascade,
  rule_key text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  detail text,
  created_at timestamptz not null default now(),
  unique (appointment_id, rule_key)
);
create index if not exists idx_reminder_sends_company on public.reminder_sends (company_id, created_at desc);

alter table public.reminder_sends enable row level security;
drop policy if exists reminder_sends_read on public.reminder_sends;
create policy reminder_sends_read on public.reminder_sends for select to authenticated using (company_id = public.get_my_clinic_company_id());
drop policy if exists reminder_sends_service on public.reminder_sends;
create policy reminder_sends_service on public.reminder_sends for all to service_role using (true) with check (true);

do $$ begin
  perform cron.unschedule('reminders-sweep');
exception when others then null; end $$;
select cron.schedule('reminders-sweep', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/reminders-runner',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-runner-secret', (select value from public.connect_config where key = 'runner_secret')),
    body := '{}'::jsonb);
$cron$);
