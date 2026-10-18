-- Private bucket for table exports. No policies: only the service role (backup function) can read or write it.
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;
