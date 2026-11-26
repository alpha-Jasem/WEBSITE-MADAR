-- Company team chat, inbox macros, workspace settings (lead stages, custom fields, branding, notification preferences)
-- and the partner (owner-level) settings. NOT applied yet: run only after review.
-- Every company table is limited to the signed-in user's own company (public.get_my_clinic_company_id()).
-- Settings are written by the account owner only, like the assignment rules.

-- ---------------------------------------------------------------- team chat
create table if not exists public.company_team_chat (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel text not null default 'general' check (length(channel) between 1 and 40),
  from_id uuid not null references auth.users(id) on delete cascade,
  from_name text not null default '',
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists idx_company_team_chat_channel on public.company_team_chat (company_id, channel, created_at desc);
alter table public.company_team_chat enable row level security;
drop policy if exists company_team_chat_read on public.company_team_chat;
create policy company_team_chat_read on public.company_team_chat for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
-- Anyone in the company writes, only as themselves.
drop policy if exists company_team_chat_insert on public.company_team_chat;
create policy company_team_chat_insert on public.company_team_chat for insert to authenticated
  with check (company_id = public.get_my_clinic_company_id() and from_id = auth.uid());
drop policy if exists company_team_chat_delete_own on public.company_team_chat;
create policy company_team_chat_delete_own on public.company_team_chat for delete to authenticated
  using (company_id = public.get_my_clinic_company_id() and from_id = auth.uid());
drop policy if exists company_team_chat_service on public.company_team_chat;
create policy company_team_chat_service on public.company_team_chat for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------- macros
-- actions: [{ "type": "note" | "reply" | "status" | "transfer", "value": text, "team_id": uuid? }]
create table if not exists public.inbox_macros (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0 and length(name) <= 80),
  description text,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_inbox_macros_company on public.inbox_macros (company_id, created_at);
alter table public.inbox_macros enable row level security;
drop policy if exists inbox_macros_company on public.inbox_macros;
create policy inbox_macros_company on public.inbox_macros for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());
drop policy if exists inbox_macros_service on public.inbox_macros;
create policy inbox_macros_service on public.inbox_macros for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------- workspace settings
create table if not exists public.lead_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null check (length(trim(label)) > 0 and length(label) <= 40),
  color text not null default '#7aa2ff',
  position int not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_stages_company on public.lead_stages (company_id, position);

create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null check (length(trim(label)) > 0 and length(label) <= 60),
  field_type text not null default 'text' check (field_type in ('text', 'number', 'date', 'select', 'yes_no')),
  options text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_custom_fields_company on public.custom_fields (company_id, position);

-- One row per company: branding and notification preferences.
create table if not exists public.company_prefs (
  company_id uuid primary key references public.companies(id) on delete cascade,
  display_name text,
  logo_url text,
  brand_color text check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$'),
  notify jsonb not null default '{"new_conversation":true,"needs_review":true,"assigned_to_me":true,"sla_breach":true,"daily_summary":false}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['lead_stages', 'custom_fields', 'company_prefs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id = public.get_my_clinic_company_id())', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (company_id in (select id from public.companies where auth_user_id = auth.uid())) with check (company_id in (select id from public.companies where auth_user_id = auth.uid()))', t || '_owner_write', t);
    execute format('drop policy if exists %I on public.%I', t || '_service', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- partner (owner-level) settings
-- One row, admin only. Stored configuration for the public sign-up page, payment model, legal links and the partner webhook.
create table if not exists public.partner_settings (
  id int primary key default 1 check (id = 1),
  display_name text not null default 'مدار',
  contact_email text,
  public_signup boolean not null default false,
  trial_without_card boolean not null default false,
  customers_add_payment_method boolean not null default true,
  help_url text,
  docs_url text,
  terms_url text,
  privacy_url text,
  webhook_url text,
  connect_redirect_url text,
  updated_at timestamptz not null default now()
);
insert into public.partner_settings (id) values (1) on conflict do nothing;
alter table public.partner_settings enable row level security;
drop policy if exists partner_settings_admin on public.partner_settings;
create policy partner_settings_admin on public.partner_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
