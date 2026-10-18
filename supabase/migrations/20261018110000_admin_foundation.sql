-- Admin foundation: demo flag on companies, guard for billing columns, real integration health, audit trail.

-- Demo flag: every existing company starts as demo. The owner flips real customers explicitly.
alter table public.companies add column if not exists is_demo boolean not null default true;
update public.companies set is_demo = true where is_demo is distinct from true;

-- A tenant owner may edit profile fields but not plan, limits, billing, status or ownership.
-- Direct PostgREST calls run as role authenticated/anon; admin, service role and SECURITY DEFINER functions pass.
create or replace function public.guard_company_sensitive_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if (new.plan, new.status, new.message_limit, new.messages_used, new.plan_reset_at, new.trial_ends_at,
        new.clinic_plan_code, new.subscription_status, new.subscription_start_date, new.subscription_end_date,
        new.monthly_usage_cycle_start, new.monthly_usage_cycle_end, new.manual_override_status,
        new.payment_provider, new.external_subscription_id, new.last_payment_status, new.last_payment_at,
        new.auth_user_id, new.dashboard_modules, new.package_type, new.webhook_token, new.public_checkin_token, new.is_demo)
       is distinct from
       (old.plan, old.status, old.message_limit, old.messages_used, old.plan_reset_at, old.trial_ends_at,
        old.clinic_plan_code, old.subscription_status, old.subscription_start_date, old.subscription_end_date,
        old.monthly_usage_cycle_start, old.monthly_usage_cycle_end, old.manual_override_status,
        old.payment_provider, old.external_subscription_id, old.last_payment_status, old.last_payment_at,
        old.auth_user_id, old.dashboard_modules, old.package_type, old.webhook_token, old.public_checkin_token, old.is_demo)
    then
      raise exception 'forbidden_company_field_change' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_company_sensitive_columns on public.companies;
create trigger guard_company_sensitive_columns
  before update on public.companies
  for each row execute function public.guard_company_sensitive_columns();

-- Real connection checks written by the integration-health function (service role only writes).
create table if not exists public.integration_checks (
  key text primary key,
  label text not null,
  status text not null default 'unchecked' check (status in ('not_configured', 'unchecked', 'ok', 'degraded', 'failed')),
  detail text not null default '',
  latency_ms int,
  last_checked_at timestamptz,
  last_ok_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.integration_checks enable row level security;
create policy integration_checks_admin_read on public.integration_checks
  for select to authenticated using (public.is_admin());

-- One audit trail for sensitive owner/agent actions. Rows are never updated or deleted from the app.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_type text not null default 'owner' check (actor_type in ('owner', 'agent', 'system')),
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id);
alter table public.audit_events enable row level security;
create policy audit_events_admin_read on public.audit_events
  for select to authenticated using (public.is_admin());
create policy audit_events_admin_insert on public.audit_events
  for insert to authenticated with check (public.is_admin() and actor_id = auth.uid());
