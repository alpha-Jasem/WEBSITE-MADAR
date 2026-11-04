-- Madar Quotation: a separate product with its own dashboard (/quotation). Additive only: new qt_* tables,
-- one new column on companies. Existing Voice AI tables and data are untouched.
--
-- Isolation: every qt_* row carries company_id and is visible only to members of that company
-- (public.get_my_clinic_company_id() resolves owner or staff). Costs live in their own table, readable
-- only by the account owner and managers. Buyers never touch the tables: they go through two
-- security-definer functions keyed by an unguessable token.

alter table public.companies add column if not exists products text[] not null default array['voice_ai'];

-- Which products a company has is a commercial decision: only Madar admins change it.
create or replace function public.guard_company_products()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() and new.products is distinct from old.products then
    raise exception 'forbidden_company_field_change' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_company_products on public.companies;
create trigger guard_company_products before update on public.companies
  for each row execute function public.guard_company_products();

-- Owner or manager of the caller's company: may see costs and approve exceptions.
create or replace function public.qt_is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies c where c.auth_user_id = auth.uid())
      or exists (select 1 from public.company_users u where u.auth_user_id = auth.uid() and u.role in ('owner', 'manager'));
$$;
revoke all on function public.qt_is_manager() from public;
grant execute on function public.qt_is_manager() to authenticated;

create table if not exists public.qt_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  currency text not null default 'SAR',
  vat_rate numeric not null default 15 check (vat_rate >= 0 and vat_rate <= 100),
  validity_days int not null default 14 check (validity_days between 1 and 365),
  auto_issue_max_total numeric,
  max_discount_pct numeric not null default 10,
  min_margin_pct numeric not null default 15,
  price_max_age_days int not null default 90,
  payment_terms text not null default '',
  delivery_terms text not null default '',
  quote_prefix text not null default 'Q',
  next_number int not null default 1001,
  updated_at timestamptz not null default now()
);

create table if not exists public.qt_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku text not null default '',
  name text not null,
  name_en text,
  description text,
  unit text not null default 'حبة',
  unit_price numeric check (unit_price is null or unit_price >= 0),
  price_source text not null default '',
  price_updated_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists qt_products_sku on public.qt_products (company_id, sku) where sku <> '';

create table if not exists public.qt_product_costs (
  product_id uuid primary key references public.qt_products(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  unit_cost numeric check (unit_cost is null or unit_cost >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.qt_customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text, phone text, email text,
  created_at timestamptz not null default now()
);

create table if not exists public.qt_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  number text not null,
  customer_id uuid references public.qt_customers(id) on delete set null,
  owner_name text not null default '',
  doc_status text not null default 'draft' check (doc_status in ('draft','ready','sent','accepted','rejected','expired')),
  work_state text not null default 'none' check (work_state in ('none','preparing','needs_info','awaiting_approval')),
  lines jsonb not null default '[]',
  discount_pct numeric not null default 0,
  vat_rate numeric not null default 15,
  currency text not null default 'SAR',
  valid_until date not null,
  payment_terms text not null default '',
  delivery_terms text not null default '',
  lang text not null default 'ar' check (lang in ('ar','en')),
  version int not null default 1,
  totals jsonb not null default '{}',
  prep_started_at timestamptz, prep_finished_at timestamptz,
  issued_auto boolean not null default false,
  public_token text not null unique,
  accepted_at timestamptz, accepted_by text, accepted_version int,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number),
  unique (company_id, idempotency_key)
);

create table if not exists public.qt_quote_versions (
  quote_id uuid not null references public.qt_quotes(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  total numeric not null default 0,
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  primary key (quote_id, version)
);

create table if not exists public.qt_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid not null references public.qt_quotes(id) on delete cascade,
  reasons text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  decided_by text, decided_at timestamptz, note text
);

create table if not exists public.qt_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid references public.qt_quotes(id) on delete cascade,
  kind text not null,
  body text not null default '',
  actor text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists qt_events_quote on public.qt_events (quote_id, created_at desc);

-- Row-level security: members of the company only.
do $$
declare t text;
begin
  foreach t in array array['qt_settings','qt_products','qt_customers','qt_quotes','qt_quote_versions','qt_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_member', t);
    execute format('create policy %I on public.%I for all to authenticated using (company_id = public.get_my_clinic_company_id()) with check (company_id = public.get_my_clinic_company_id())', t || '_member', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- Costs and approval decisions: owner/managers of the company only.
alter table public.qt_product_costs enable row level security;
drop policy if exists qt_product_costs_manager on public.qt_product_costs;
create policy qt_product_costs_manager on public.qt_product_costs for all to authenticated
  using (company_id = public.get_my_clinic_company_id() and public.qt_is_manager())
  with check (company_id = public.get_my_clinic_company_id() and public.qt_is_manager());

alter table public.qt_approvals enable row level security;
drop policy if exists qt_approvals_read on public.qt_approvals;
create policy qt_approvals_read on public.qt_approvals for select to authenticated using (company_id = public.get_my_clinic_company_id());
drop policy if exists qt_approvals_request on public.qt_approvals;
create policy qt_approvals_request on public.qt_approvals for insert to authenticated
  with check (company_id = public.get_my_clinic_company_id() and status = 'pending');
drop policy if exists qt_approvals_decide on public.qt_approvals;
create policy qt_approvals_decide on public.qt_approvals for update to authenticated
  using (company_id = public.get_my_clinic_company_id() and public.qt_is_manager())
  with check (company_id = public.get_my_clinic_company_id() and public.qt_is_manager());

-- Atomic quote numbers per company.
create or replace function public.qt_next_number()
returns text language plpgsql security definer set search_path = public as $$
declare cid uuid := public.get_my_clinic_company_id(); n int; p text;
begin
  if cid is null then raise exception 'not a company member'; end if;
  insert into public.qt_settings (company_id) values (cid) on conflict do nothing;
  update public.qt_settings set next_number = next_number + 1 where company_id = cid returning next_number - 1, quote_prefix into n, p;
  return p || '-' || n;
end $$;
revoke all on function public.qt_next_number() from public;
grant execute on function public.qt_next_number() to authenticated;

-- Buyer link: read the current version (no costs, no internal notes).
create or replace function public.qt_public_quote(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', q.number, 'version', q.version, 'doc_status', q.doc_status, 'valid_until', q.valid_until,
    'currency', q.currency, 'vat_rate', q.vat_rate, 'discount_pct', q.discount_pct, 'lang', q.lang,
    'payment_terms', q.payment_terms, 'delivery_terms', q.delivery_terms, 'totals', q.totals,
    'lines', (select coalesce(jsonb_agg(l - 'unitCost' - 'candidates'), '[]') from jsonb_array_elements(q.lines) l),
    'company', jsonb_build_object('name', c.name, 'logo_url', c.logo_url),
    'customer', (select jsonb_build_object('name', k.name) from public.qt_customers k where k.id = q.customer_id),
    'accepted_at', q.accepted_at, 'accepted_by', q.accepted_by, 'accepted_version', q.accepted_version)
  from public.qt_quotes q join public.companies c on c.id = q.company_id
  where q.public_token = p_token and length(p_token) >= 32;
$$;

-- Buyer link: accept the current version or ask for a change. Rejects stale versions and expired quotes.
create or replace function public.qt_public_respond(p_token text, p_version int, p_action text, p_name text, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.qt_quotes;
begin
  if length(coalesce(p_token, '')) < 32 then return jsonb_build_object('ok', false, 'message', 'الرابط غير صالح'); end if;
  select * into q from public.qt_quotes where public_token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'الرابط غير صالح'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'message', 'اكتب اسمك'); end if;
  if q.valid_until < current_date or q.doc_status = 'expired' then return jsonb_build_object('ok', false, 'message', 'انتهت صلاحية هذا العرض. اطلب نسخة محدّثة.'); end if;
  if q.version <> p_version then return jsonb_build_object('ok', false, 'message', 'تم تحديث العرض بعد فتحك له. حدّث الصفحة وراجع النسخة الحالية.'); end if;
  if q.doc_status <> 'sent' then return jsonb_build_object('ok', false, 'message', case when q.doc_status = 'accepted' then 'تم قبول هذا العرض مسبقًا.' else 'هذا العرض غير متاح للقبول الآن.' end); end if;
  if p_action = 'accept' then
    update public.qt_quotes set doc_status = 'accepted', accepted_at = now(), accepted_by = trim(p_name), accepted_version = q.version, updated_at = now() where id = q.id;
    insert into public.qt_events (company_id, quote_id, kind, body, actor) values (q.company_id, q.id, 'accepted', 'قبل ' || trim(p_name) || ' النسخة ' || q.version, trim(p_name));
    return jsonb_build_object('ok', true, 'message', 'تم قبول العرض ' || q.number || ' (النسخة ' || q.version || '). سيتواصل معك فريق المبيعات لإكمال الطلب.');
  elsif p_action = 'change' then
    update public.qt_quotes set doc_status = 'draft', work_state = 'needs_info', updated_at = now() where id = q.id;
    insert into public.qt_events (company_id, quote_id, kind, body, actor) values (q.company_id, q.id, 'change_request', 'طلب تعديل من ' || trim(p_name) || ': ' || left(coalesce(p_note, ''), 2000), trim(p_name));
    return jsonb_build_object('ok', true, 'message', 'وصل طلب التعديل. بنرسل لك نسخة محدّثة بعد مراجعته.');
  end if;
  return jsonb_build_object('ok', false, 'message', 'إجراء غير معروف');
end $$;
revoke all on function public.qt_public_quote(text) from public;
revoke all on function public.qt_public_respond(text, int, text, text, text) from public;
grant execute on function public.qt_public_quote(text) to anon, authenticated;
grant execute on function public.qt_public_respond(text, int, text, text, text) to anon, authenticated;
