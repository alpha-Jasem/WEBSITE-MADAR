-- Separates the team board from the to-do app sync. Tasks created on the team board are marked is_team and are never
-- pushed to the task app; every existing row keeps is_team = false and stays where the command center shows it.
alter table public.admin_tasks add column if not exists is_team boolean not null default false;
create index if not exists idx_admin_tasks_team on public.admin_tasks (is_team, done);
