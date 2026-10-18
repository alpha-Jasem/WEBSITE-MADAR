-- Security hardening found by the Oct 2026 truth audit.
--  1. Any signed-in user could UPDATE public.users SET role = 'admin' on their own row (no column limit).
--  2. crm_leads had full anon + authenticated access (policies with USING true).
--  3. sales_blitz_leads policy named "admin only" applied to every role.
-- Backups of the affected tables were exported before applying (outside the repo).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- 1) users: a user may edit only their own display fields, never role.
drop policy if exists update_own on public.users;
drop policy if exists users_auth_update on public.users;
drop policy if exists users_self_update on public.users;
drop policy if exists service_insert on public.users;
drop policy if exists users_auth_insert on public.users;

create policy users_self_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_auth_insert on public.users
  for insert to authenticated
  with check (id = auth.uid() and role = 'client');

revoke update on public.users from anon, authenticated;
grant update (full_name, email) on public.users to authenticated;
revoke insert on public.users from anon;

-- 2) crm_leads: agency pipeline, admin only.
drop policy if exists anon_full_access on public.crm_leads;
drop policy if exists auth_full_access on public.crm_leads;
create policy crm_leads_admin on public.crm_leads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3) sales_blitz_leads: agency campaign, admin only.
drop policy if exists "admin only" on public.sales_blitz_leads;
create policy sales_blitz_admin on public.sales_blitz_leads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
