-- Sales foundation: one model for the agency's acquisition (Outreach is the source of truth).
-- Adds deals + events, a shared do-not-contact list, campaigns and monthly goals, then copies
-- Sales Blitz and CRM pipeline rows into it. Original tables are left untouched.

-- Admin must be able to update companies from the dashboard (previously updated 0 rows silently).
drop policy if exists companies_admin_update on public.companies;
create policy companies_admin_update on public.companies
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.normalize_sa_phone(p text)
returns text
language plpgsql
immutable
as $$
declare d text;
begin
  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  if d like '00%' then d := substr(d, 3); end if;
  if d like '966%' then d := substr(d, 4); end if;
  if d like '0%' then d := substr(d, 2); end if;
  if length(d) <> 9 then return null; end if;
  return '966' || d;
end;
$$;

-- Extra columns on the target-company table.
alter table public.outreach_leads
  add column if not exists campaign text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists legacy_ref text;
create unique index if not exists outreach_leads_legacy_ref_key on public.outreach_leads (legacy_ref) where legacy_ref is not null;

-- Shared do-not-contact list (opt-outs, existing customers, invalid data).
create table if not exists public.do_not_contact (
  id uuid primary key default gen_random_uuid(),
  phone text,
  company_name text not null default '',
  reason text not null default 'opt_out' check (reason in ('opt_out', 'existing_customer', 'invalid', 'unsuitable')),
  scope text not null default 'all' check (scope in ('all', 'campaign', 'agent')),
  campaign text not null default '',
  note text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists do_not_contact_phone_key on public.do_not_contact (phone) where phone is not null;
alter table public.do_not_contact enable row level security;
create policy do_not_contact_admin on public.do_not_contact
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_do_not_contact(p text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.do_not_contact d where d.phone = public.normalize_sa_phone(p))
      or exists (select 1 from public.companies c where public.normalize_sa_phone(c.owner_phone) = public.normalize_sa_phone(p));
$$;
revoke all on function public.is_do_not_contact(text) from public;
grant execute on function public.is_do_not_contact(text) to authenticated, service_role;

-- Defence in depth: a blocked number can never be inserted as a lead, by any path.
create or replace function public.skip_blocked_outreach_lead()
returns trigger
language plpgsql
as $$
begin
  if public.is_do_not_contact(new.phone) then
    return null;
  end if;
  return new;
end;
$$;
drop trigger if exists skip_blocked_outreach_lead on public.outreach_leads;
create trigger skip_blocked_outreach_lead before insert on public.outreach_leads
  for each row execute function public.skip_blocked_outreach_lead();

-- Campaigns (configuration owned by the owner; execution comes in a later phase).
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text not null default '',
  city text not null default '',
  source text not null default 'google_maps' check (source in ('google_maps', 'linkedin', 'both', 'manual')),
  service text not null default '',
  offer text not null default '',
  price_net numeric,
  max_discount_pct numeric check (max_discount_pct is null or (max_discount_pct >= 0 and max_discount_pct <= 100)),
  qualifiers jsonb not null default '{}'::jsonb,
  exclusions jsonb not null default '{}'::jsonb,
  work_hours jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'running', 'paused', 'done')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
create policy campaigns_admin on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Deals: the sales stages on top of a target company. Money fields stay null until a price is approved.
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outreach_leads(id) on delete set null,
  company_name text not null,
  contact_name text not null default '',
  contact_phone text not null default '',
  stage text not null default 'new' check (stage in ('new', 'contacted', 'interested', 'qualified', 'offer_sent', 'negotiation', 'awaiting_payment', 'won', 'lost')),
  lost_reason text not null default '',
  campaign text not null default '',
  source text not null default '',
  owner_type text not null default 'owner' check (owner_type in ('owner', 'agent')),
  owner_ref text not null default '',
  service text not null default '',
  scope text not null default '',
  value_net numeric,
  tax_amount numeric,
  value_total numeric,
  currency text not null default 'SAR',
  last_contact_at timestamptz,
  next_step text not null default '',
  next_step_at timestamptz,
  sourced_by text not null default '',
  closed_by text not null default '',
  legacy_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index if not exists deals_lead_id_key on public.deals (lead_id) where lead_id is not null;
create unique index if not exists deals_legacy_ref_key on public.deals (legacy_ref) where legacy_ref is not null;
create index if not exists deals_stage_idx on public.deals (stage);
create index if not exists deals_next_step_idx on public.deals (next_step_at) where next_step_at is not null;
alter table public.deals enable row level security;
create policy deals_admin on public.deals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  actor_type text not null default 'owner' check (actor_type in ('owner', 'agent', 'system')),
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists deal_events_deal_idx on public.deal_events (deal_id, created_at desc);
alter table public.deal_events enable row level security;
create policy deal_events_admin on public.deal_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Monthly goal, editable by the owner. kind 'collections' means confirmed collected money.
create table if not exists public.agency_goals (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  kind text not null default 'collections' check (kind in ('collections', 'closed_deals', 'qualified_leads')),
  target numeric not null check (target >= 0),
  currency text not null default 'SAR',
  updated_at timestamptz not null default now(),
  unique (period, kind)
);
alter table public.agency_goals enable row level security;
create policy agency_goals_admin on public.agency_goals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Copy legacy sales_blitz_leads into outreach_leads (idempotent through legacy_ref).
insert into public.outreach_leads (name, phone, is_mobile, city, address, category, source, status, notes, campaign, contact_name, legacy_ref, created_at)
select
  s.clinic,
  public.normalize_sa_phone(s.phone),
  public.normalize_sa_phone(s.phone) like '9665%',
  'جدة',
  s.area,
  case s.segment when 'dental' then 'عيادات أسنان' when 'skin' then 'مراكز تجميل' else 'مراكز طبية' end,
  'sales_blitz',
  case s.status when 'pending' then 'new' when 'contacted' then 'contacted' when 'meeting_booked' then 'meeting'
                when 'silent' then 'no_answer' when 'won' then 'won' when 'lost' then 'lost' else 'new' end,
  s.notes,
  s.campaign,
  s.contact,
  'sales_blitz_leads:' || s.id,
  s.created_at
from public.sales_blitz_leads s
where public.normalize_sa_phone(s.phone) is not null
on conflict do nothing;

-- Deals for blitz rows that moved beyond "new", and for every CRM pipeline row.
insert into public.deals (lead_id, company_name, contact_name, contact_phone, stage, campaign, source, last_contact_at, legacy_ref, created_at)
select o.id, o.name, o.contact_name, o.phone,
  case o.status when 'meeting' then 'qualified' else 'contacted' end,
  o.campaign, 'sales_blitz', o.created_at, 'blitz_deal:' || o.legacy_ref, o.created_at
from public.outreach_leads o
where o.legacy_ref like 'sales_blitz_leads:%' and o.status in ('contacted', 'meeting', 'no_answer')
on conflict do nothing;

insert into public.deals (company_name, contact_phone, stage, source, next_step_at, legacy_ref, created_at)
select
  c.company_name,
  coalesce(public.normalize_sa_phone(c.contact_whatsapp), public.normalize_sa_phone(c.contact_phone), ''),
  case
    when c.stage ilike '%meeting%' then 'qualified'
    when c.stage ilike '%won%' or c.stage ilike '%closed%' then 'won'
    when c.stage ilike '%lost%' then 'lost'
    else 'new'
  end,
  'crm_leads',
  c.follow_up_date::timestamptz,
  'crm_leads:' || c.id,
  c.created_at
from public.crm_leads c
on conflict do nothing;
