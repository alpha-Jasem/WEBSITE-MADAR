-- Phones of leads the owner deleted: a later fetch must not bring them back.
create table if not exists public.deleted_leads (
  phone text primary key,
  deleted_at timestamptz not null default now()
);
alter table public.deleted_leads enable row level security;
drop policy if exists deleted_leads_admin on public.deleted_leads;
create policy deleted_leads_admin on public.deleted_leads for all to authenticated using (public.is_admin()) with check (public.is_admin());
