-- Live usage: the dashboard listens to the company's usage row, so the ring and the usage page move
-- as calls finish. Row access is already limited to the company (policy "clinic own company"). Additive only.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clinic_os_usage') then
    alter publication supabase_realtime add table public.clinic_os_usage;
  end if;
end $$;
