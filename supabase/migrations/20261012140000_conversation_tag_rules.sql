-- Per-company overrides of the automatic conversation tags: rename or disable a built-in tag
-- (tag_key = its id, e.g. 'sales') or add a custom one (tag_key = 'custom_<id>') matched by keywords.
create table if not exists public.conversation_tag_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tag_key text not null,
  label text not null,
  keywords text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, tag_key)
);
alter table public.conversation_tag_rules enable row level security;
create policy conversation_tag_rules_own_company on public.conversation_tag_rules for all to authenticated
  using (company_id = public.get_my_clinic_company_id()) with check (company_id = public.get_my_clinic_company_id());
