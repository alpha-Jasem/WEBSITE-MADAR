-- Onboarding workspaces, sales agents with limits, and the marketers (commission) program.
-- Nothing here sends a message, an invitation or a payout: those stay owner decisions.

-- ---------------------------------------------------------------- onboarding
create table if not exists public.onboarding_projects (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete set null,
  contract_id uuid references public.contracts(id),
  company_id uuid references public.companies(id) on delete set null,
  customer_name text not null,
  status text not null default 'requirements' check (status in ('requirements', 'building', 'testing', 'ready', 'live', 'paused')),
  clock_rule text not null default 'requirements_complete' check (clock_rule in ('contract_signed', 'payment_confirmed', 'requirements_complete')),
  clock_started_at timestamptz,
  target_date date,
  invite_status text not null default 'not_created' check (invite_status in ('not_created', 'created_not_sent', 'sent')),
  note text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists onboarding_projects_contract_key on public.onboarding_projects (contract_id) where contract_id is not null;

create table if not exists public.onboarding_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.onboarding_projects(id) on delete cascade,
  service_code text not null default '',
  title text not null,
  kind text not null default 'step' check (kind in ('step', 'gate')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  assignee text not null default 'owner' check (assignee in ('owner', 'agent', 'client')),
  due_at timestamptz,
  required_input text not null default '',
  blocked_reason text not null default '',
  last_error text not null default '',
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists onboarding_items_project_idx on public.onboarding_items (project_id);

-- A service cannot go live until it has gates (connection, tests, owner approval) and every gate is done.
create or replace function public.guard_go_live()
returns trigger language plpgsql as $$
declare gates int; open_gates int;
begin
  if new.status = 'live' and old.status is distinct from 'live' then
    select count(*), count(*) filter (where status <> 'done') into gates, open_gates
      from public.onboarding_items where project_id = new.id and kind = 'gate';
    if gates = 0 then raise exception 'go_live_requires_gates' using errcode = '23514'; end if;
    if open_gates > 0 then raise exception 'go_live_blocked_by_open_gates' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_go_live on public.onboarding_projects;
create trigger guard_go_live before update on public.onboarding_projects for each row execute function public.guard_go_live();

-- ---------------------------------------------------------------- sales agents
create table if not exists public.sales_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'seller' check (role in ('seller', 'supervisor')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'stopped')),
  daily_message_cap int not null default 50 check (daily_message_cap between 0 and 1000),
  min_price numeric check (min_price is null or min_price >= 0),
  max_discount_pct numeric check (max_discount_pct is null or max_discount_pct between 0 and 100),
  spend_cap numeric check (spend_cap is null or spend_cap >= 0),
  can_promise_scope boolean not null default false,
  needs_owner_for text[] not null default array['price_exception', 'scope_promise', 'discount_above_max'],
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.deals add column if not exists agent_paused boolean not null default false;

-- Only one agent may own a company at a time.
create table if not exists public.agent_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.sales_agents(id),
  lead_id uuid not null references public.outreach_leads(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  released_at timestamptz
);
create unique index if not exists agent_assignments_one_active on public.agent_assignments (lead_id) where released_at is null;

create table if not exists public.agent_drafts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.sales_agents(id),
  lead_id uuid not null references public.outreach_leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  channel text not null default 'whatsapp',
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'cancelled', 'sent')),
  is_trial boolean not null default false,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  sent_at timestamptz
);
create index if not exists agent_drafts_agent_day_idx on public.agent_drafts (agent_id, sent_at);

-- Sending (marking sent) obeys the agent state, the daily cap, the shared do-not-contact list and the owner hand-over.
create or replace function public.guard_agent_send()
returns trigger language plpgsql as $$
declare a record; d record; l record; today_sent int;
begin
  if new.status = 'sent' and old.status is distinct from 'sent' then
    select * into a from public.sales_agents where id = new.agent_id;
    if a.status <> 'active' then raise exception 'agent_not_active' using errcode = '23514'; end if;
    select count(*) into today_sent from public.agent_drafts
      where agent_id = new.agent_id and status = 'sent' and sent_at >= date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh';
    if today_sent >= a.daily_message_cap then raise exception 'daily_cap_reached' using errcode = '23514'; end if;
    select phone into l from public.outreach_leads where id = new.lead_id;
    if public.is_do_not_contact(l.phone) then raise exception 'do_not_contact' using errcode = '23514'; end if;
    if new.deal_id is not null then
      select owner_type, agent_paused into d from public.deals where id = new.deal_id;
      if d.agent_paused or d.owner_type = 'owner' then raise exception 'owner_has_the_deal' using errcode = '23514'; end if;
    end if;
    new.sent_at := coalesce(new.sent_at, now());
  end if;
  return new;
end $$;
drop trigger if exists guard_agent_send on public.agent_drafts;
create trigger guard_agent_send before update on public.agent_drafts for each row execute function public.guard_agent_send();

-- ---------------------------------------------------------------- marketers
create table if not exists public.marketers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  phone text not null default '',
  email text not null default '',
  status text not null default 'applied' check (status in ('applied', 'approved', 'active', 'suspended')),
  referral_code text unique,
  commission_rule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references public.marketers(id),
  company_name text not null,
  contact_phone text not null default '',
  status text not null default 'under_review' check (status in ('under_review', 'accepted', 'conflict', 'rejected')),
  attribution_note text not null default '',
  deal_id uuid references public.deals(id) on delete set null,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);
-- The same company can be accepted for one marketer only.
create unique index if not exists referrals_one_accepted_per_phone on public.referrals (contact_phone) where status = 'accepted' and contact_phone <> '';

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references public.marketers(id),
  referral_id uuid references public.referrals(id),
  invoice_id uuid references public.invoices(id),
  payment_id uuid references public.payments(id),
  base_amount numeric not null,
  rate_pct numeric,
  amount numeric not null,
  status text not null default 'pending_verification' check (status in ('pending_verification', 'on_hold', 'due', 'approved', 'paid', 'cancelled', 'adjusted')),
  hold_until date,
  adjustment_of uuid references public.commissions(id),
  reason text not null default '',
  created_at timestamptz not null default now()
);
-- One commission per marketer per payment (adjustments are separate negative rows).
create unique index if not exists commissions_one_per_payment on public.commissions (marketer_id, payment_id) where payment_id is not null and adjustment_of is null;

create table if not exists public.payout_statements (
  id uuid primary key default gen_random_uuid(),
  marketer_id uuid not null references public.marketers(id),
  period text not null,
  total numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_reference text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payout_paid_after_approval check (status <> 'paid' or (approved_by is not null and paid_at is not null and paid_reference <> ''))
);

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['onboarding_projects', 'onboarding_items', 'sales_agents', 'agent_assignments', 'agent_drafts', 'marketers', 'referrals', 'commissions', 'payout_statements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- A marketer sees only their own row, referrals, commissions and statements (no leads, chats or other marketers).
drop policy if exists marketers_self on public.marketers;
create policy marketers_self on public.marketers for select to authenticated using (auth_user_id = auth.uid());
drop policy if exists referrals_self on public.referrals;
create policy referrals_self on public.referrals for select to authenticated using (marketer_id in (select id from public.marketers where auth_user_id = auth.uid()));
drop policy if exists commissions_self on public.commissions;
create policy commissions_self on public.commissions for select to authenticated using (marketer_id in (select id from public.marketers where auth_user_id = auth.uid()));
drop policy if exists payout_statements_self on public.payout_statements;
create policy payout_statements_self on public.payout_statements for select to authenticated using (marketer_id in (select id from public.marketers where auth_user_id = auth.uid()));
