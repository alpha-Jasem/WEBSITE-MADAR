-- Commercial core: catalog, quotes, contracts, invoices, refunds, expenses, bank notices, costs, news, backups.
-- Prices stay empty until the owner approves them: nothing here invents a selling price.
-- Everything is readable and writable by the admin role only.

create sequence if not exists public.quote_seq;
create sequence if not exists public.contract_seq;
create sequence if not exists public.invoice_seq;

-- ---------------------------------------------------------------- settings
create table if not exists public.agency_settings (
  id int primary key default 1 check (id = 1),
  vat_rate numeric not null default 15 check (vat_rate between 0 and 100),
  vat_registered boolean not null default true,
  min_margin_pct numeric not null default 30 check (min_margin_pct between 0 and 100),
  renewal_alert_days int not null default 30,
  payroll_enabled boolean not null default false,
  attribution_window_days int,
  attribution_priority text check (attribution_priority in ('first_referrer', 'last_referrer', 'owner_decides')),
  updated_at timestamptz not null default now()
);
insert into public.agency_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- catalog
create table if not exists public.agency_services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('ai_sales', 'customer_service', 'voice', 'automation', 'website', 'custom')),
  description text not null default '',
  voice_provider text check (voice_provider in ('elevenlabs', 'fish_audio')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier int not null check (tier between 1 and 3),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now()
);

create table if not exists public.package_services (
  package_id uuid not null references public.packages(id) on delete cascade,
  service_id uuid not null references public.agency_services(id) on delete cascade,
  included_usage jsonb not null default '{}'::jsonb,
  primary key (package_id, service_id)
);

-- Approved price versions are frozen: a change is a new version, never an edit.
create table if not exists public.package_prices (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  version int not null,
  setup_net numeric check (setup_net is null or setup_net >= 0),
  monthly_net numeric check (monthly_net is null or monthly_net >= 0),
  overage_note text not null default '',
  external_cost_monthly numeric check (external_cost_monthly is null or external_cost_monthly >= 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (package_id, version),
  constraint package_prices_approved_has_actor check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

create or replace function public.freeze_approved_price()
returns trigger language plpgsql as $$
begin
  if old.status = 'approved' and (new.setup_net, new.monthly_net, new.external_cost_monthly, new.package_id, new.version)
     is distinct from (old.setup_net, old.monthly_net, old.external_cost_monthly, old.package_id, old.version) then
    raise exception 'approved_price_is_frozen' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists freeze_approved_price on public.package_prices;
create trigger freeze_approved_price before update on public.package_prices for each row execute function public.freeze_approved_price();

insert into public.packages (name, tier, description) values
  ('الباقة 1 (مسودة)', 1, 'الاسم والمحتوى والسعر لم تُعتمد بعد'),
  ('الباقة 2 (مسودة)', 2, 'الاسم والمحتوى والسعر لم تُعتمد بعد'),
  ('الباقة 3 (مسودة)', 3, 'الاسم والمحتوى والسعر لم تُعتمد بعد')
on conflict do nothing;

insert into public.agency_services (code, name, category, description) values
  ('ai_sales', 'AI Sales', 'ai_sales', 'وكيل مبيعات يرد ويؤهل ويتابع'),
  ('customer_service', 'خدمة عملاء AI', 'customer_service', 'وكيل خدمة عملاء على واتساب'),
  ('voice_elevenlabs', 'حل صوتي (ElevenLabs)', 'voice', 'وكيل صوتي عبر ElevenLabs'),
  ('voice_fish', 'حل صوتي (Fish Audio)', 'voice', 'وكيل صوتي عبر Fish Audio'),
  ('automation_n8n', 'أتمتة (n8n)', 'automation', 'سيناريوهات أتمتة خلف الكواليس'),
  ('website', 'موقع إلكتروني', 'website', 'إنشاء موقع أو تحديث موقع قديم'),
  ('custom', 'حل مخصص', 'custom', 'نطاق يتفق عليه لكل عميل')
on conflict (code) do nothing;
update public.agency_services set voice_provider = 'elevenlabs' where code = 'voice_elevenlabs' and voice_provider is null;
update public.agency_services set voice_provider = 'fish_audio' where code = 'voice_fish' and voice_provider is null;

-- ---------------------------------------------------------------- quotes and contracts
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('Q-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quote_seq')::text, 4, '0')),
  deal_id uuid references public.deals(id) on delete set null,
  customer_name text not null,
  package_id uuid references public.packages(id),
  lines jsonb not null default '[]'::jsonb,
  scope text not null default '',
  delivery_days int check (delivery_days is null or delivery_days > 0),
  payment_terms text not null default '',
  setup_net numeric not null default 0 check (setup_net >= 0),
  monthly_net numeric not null default 0 check (monthly_net >= 0),
  discount_pct numeric not null default 0 check (discount_pct between 0 and 100),
  vat_rate numeric not null default 15 check (vat_rate between 0 and 100),
  net_total numeric not null default 0,
  tax_total numeric not null default 0,
  grand_total numeric not null default 0,
  currency text not null default 'SAR',
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until date,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  accepted_at timestamptz,
  snapshot jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint quotes_totals_add_up check (abs((net_total + tax_total) - grand_total) < 0.01),
  constraint quotes_approved_has_snapshot check (status = 'draft' or (snapshot is not null and approved_by is not null))
);
create index if not exists quotes_deal_idx on public.quotes (deal_id);

-- After approval the commercial terms cannot change; only the status moves forward.
create or replace function public.freeze_approved_quote()
returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' and (new.lines, new.scope, new.setup_net, new.monthly_net, new.discount_pct, new.vat_rate, new.net_total, new.tax_total, new.grand_total, new.snapshot, new.customer_name)
     is distinct from (old.lines, old.scope, old.setup_net, old.monthly_net, old.discount_pct, old.vat_rate, old.net_total, old.tax_total, old.grand_total, old.snapshot, old.customer_name) then
    raise exception 'approved_quote_is_frozen' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists freeze_approved_quote on public.quotes;
create trigger freeze_approved_quote before update on public.quotes for each row execute function public.freeze_approved_quote();

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('C-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.contract_seq')::text, 4, '0')),
  quote_id uuid not null references public.quotes(id),
  deal_id uuid references public.deals(id) on delete set null,
  customer_name text not null,
  terms jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'signed', 'active', 'ended', 'cancelled')),
  term_months int check (term_months is null or term_months > 0),
  starts_at date,
  renews_at date,
  signed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists contracts_quote_key on public.contracts (quote_id) where status <> 'cancelled';

create or replace function public.freeze_contract_terms()
returns trigger language plpgsql as $$
begin
  if new.terms is distinct from old.terms or new.quote_id is distinct from old.quote_id then
    raise exception 'contract_terms_are_frozen' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists freeze_contract_terms on public.contracts;
create trigger freeze_contract_terms before update on public.contracts for each row execute function public.freeze_contract_terms();

-- ---------------------------------------------------------------- invoices, payments, refunds
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 4, '0')),
  contract_id uuid references public.contracts(id),
  quote_id uuid references public.quotes(id),
  deal_id uuid references public.deals(id) on delete set null,
  customer_name text not null,
  lines jsonb not null default '[]'::jsonb,
  net_total numeric not null check (net_total >= 0),
  tax_total numeric not null check (tax_total >= 0),
  grand_total numeric not null check (grand_total > 0),
  currency text not null default 'SAR',
  status text not null default 'issued' check (status in ('issued', 'void')),
  issued_at timestamptz not null default now(),
  due_at date,
  voided_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint invoices_totals_add_up check (abs((net_total + tax_total) - grand_total) < 0.01)
);
create index if not exists invoices_deal_idx on public.invoices (deal_id);

create or replace function public.freeze_invoice_amounts()
returns trigger language plpgsql as $$
begin
  if (new.lines, new.net_total, new.tax_total, new.grand_total, new.customer_name)
     is distinct from (old.lines, old.net_total, old.tax_total, old.grand_total, old.customer_name) then
    raise exception 'invoice_amounts_are_frozen' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists freeze_invoice_amounts on public.invoices;
create trigger freeze_invoice_amounts before update on public.invoices for each row execute function public.freeze_invoice_amounts();

alter table public.payments add column if not exists invoice_id uuid references public.invoices(id);
create index if not exists payments_invoice_idx on public.payments (invoice_id);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  invoice_id uuid references public.invoices(id),
  amount numeric not null check (amount > 0),
  reason text not null default '',
  status text not null default 'requested' check (status in ('requested', 'approved', 'executed', 'rejected')),
  reference text not null default '',
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  executed_by uuid references auth.users(id),
  executed_at timestamptz,
  constraint refunds_executed_has_actor check (status <> 'executed' or (executed_by is not null and executed_at is not null)),
  constraint refunds_approved_has_actor check (status not in ('approved', 'executed') or (approved_by is not null and approved_at is not null))
);

-- A refund can never exceed what was confirmed on that payment (counting refunds already executed or approved).
create or replace function public.guard_refund_amount()
returns trigger language plpgsql as $$
declare paid numeric; taken numeric;
begin
  select total_amount into paid from public.payments where id = new.payment_id and status = 'confirmed';
  if paid is null then raise exception 'refund_needs_confirmed_payment' using errcode = '23514'; end if;
  select coalesce(sum(amount), 0) into taken from public.refunds
    where payment_id = new.payment_id and status in ('approved', 'executed') and id <> new.id;
  if new.status in ('approved', 'executed') and taken + new.amount > paid + 0.005 then
    raise exception 'refund_exceeds_payment' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.amount > paid + 0.005 then
    raise exception 'refund_exceeds_payment' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists guard_refund_amount on public.refunds;
create trigger guard_refund_amount before insert or update on public.refunds for each row execute function public.guard_refund_amount();

create or replace view public.invoice_balances with (security_invoker = true) as
select i.id as invoice_id, i.number, i.customer_name, i.grand_total, i.status, i.due_at,
  coalesce((select sum(p.total_amount) from public.payments p where p.invoice_id = i.id and p.status = 'confirmed'), 0) as paid,
  coalesce((select sum(r.amount) from public.refunds r join public.payments p on p.id = r.payment_id where p.invoice_id = i.id and r.status = 'executed'), 0) as refunded
from public.invoices i;

-- ---------------------------------------------------------------- expenses, costs, bank notices
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('tools', 'hosting', 'servers', 'ai_agents', 'ads', 'voice_provider', 'other')),
  description text not null,
  vendor text not null default '',
  amount_net numeric not null check (amount_net >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  tax_recoverable boolean not null default false,
  incurred_at date not null default current_date,
  client_company_id uuid references public.companies(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  reference text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (incurred_at desc);

alter table public.outreach_runs add column if not exists cost_usd numeric;

create table if not exists public.bank_notifications (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manual' check (source in ('email', 'manual')),
  message_id text,
  received_at timestamptz not null default now(),
  sender text not null default '',
  amount numeric check (amount is null or amount > 0),
  currency text not null default 'SAR',
  reference text not null default '',
  beneficiary_account text not null default '',
  excerpt text not null default '',
  auth_signals jsonb not null default '{}'::jsonb,
  status text not null default 'awaiting_verification' check (status in ('awaiting_verification', 'matched', 'confirmed', 'rejected', 'duplicate')),
  matched_payment_id uuid references public.payments(id),
  note text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists bank_notifications_message_key on public.bank_notifications (message_id) where message_id is not null;
create unique index if not exists bank_notifications_ref_key on public.bank_notifications (reference, amount) where reference <> '' and amount is not null;

-- ---------------------------------------------------------------- news and backups
create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.news_sources(id) on delete cascade,
  title text not null,
  link text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (source_id, link)
);
create index if not exists news_items_pub_idx on public.news_items (published_at desc nulls last);

create table if not exists public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'tables_json',
  status text not null default 'running' check (status in ('running', 'ok', 'failed')),
  tables jsonb not null default '{}'::jsonb,
  bytes bigint,
  storage_path text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  restore_tested_at timestamptz,
  restore_test_note text not null default ''
);

-- ---------------------------------------------------------------- RLS: admin only
do $$
declare t text;
begin
  foreach t in array array['agency_settings', 'agency_services', 'packages', 'package_services', 'package_prices', 'quotes', 'contracts', 'invoices', 'refunds',
                           'expenses', 'bank_notifications', 'news_sources', 'news_items', 'backup_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;
