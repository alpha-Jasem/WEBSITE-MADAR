-- Team tools for the admin dashboard (admins only). Additive only.
--   * admin_tasks (already exists, shared with the command deck and the task-app sync): adds who the task is
--     assigned to, notes, and an "in progress" flag, so two or more admins can split the work.
--   * admin_snippets: reusable message texts (WhatsApp, email, notes) the whole team shares.

alter table public.admin_tasks add column if not exists assignee_id uuid references auth.users(id) on delete set null;
alter table public.admin_tasks add column if not exists notes text;
alter table public.admin_tasks add column if not exists in_progress boolean not null default false;
create index if not exists idx_admin_tasks_assignee on public.admin_tasks (assignee_id, done);

create table if not exists public.admin_snippets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0 and length(title) <= 120),
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  kind text not null default 'whatsapp' check (kind in ('whatsapp', 'email', 'note')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.admin_snippets enable row level security;

drop policy if exists admin_snippets_admin on public.admin_snippets;
create policy admin_snippets_admin on public.admin_snippets for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
drop policy if exists admin_snippets_service on public.admin_snippets;
create policy admin_snippets_service on public.admin_snippets for all to service_role using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.admin_snippets;
exception when others then null; end $$;
