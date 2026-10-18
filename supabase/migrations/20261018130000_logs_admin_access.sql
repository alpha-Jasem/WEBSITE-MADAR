-- The admin logs page could only ever see the admin's own company rows, and admin actions on other
-- companies could not be written (no insert policy). Give the admin role read and write access.
drop policy if exists logs_admin_all on public.logs;
create policy logs_admin_all on public.logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
