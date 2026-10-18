-- Todoist two-way sync state. The API token itself lives only in the TODOIST_API_TOKEN function secret.
alter table public.agency_settings
  add column if not exists todoist_project_ids text[] not null default '{}',
  add column if not exists todoist_last_sync_at timestamptz,
  add column if not exists todoist_last_ok_at timestamptz,
  add column if not exists todoist_last_error text;

alter table public.admin_tasks
  add column if not exists project_id text,
  add column if not exists synced_done boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();
