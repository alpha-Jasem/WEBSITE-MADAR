-- More team tools for the admin dashboard (admins only). Additive only.
--   * staff_attendance: clock in / clock out per admin.
--   * admin_skills: reusable work guides (instructions, checklists) the team shares.
--   * team-files: a private storage bucket for the team's files, readable and writable by admins only.

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  check (clock_out is null or clock_out >= clock_in)
);
create index if not exists idx_staff_attendance_user on public.staff_attendance (user_id, clock_in desc);
-- one open shift per person
create unique index if not exists uq_staff_attendance_open on public.staff_attendance (user_id) where clock_out is null;

create table if not exists public.admin_skills (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0 and length(title) <= 120),
  body text not null check (length(trim(body)) > 0 and length(body) <= 8000),
  kind text not null default 'playbook' check (kind in ('playbook', 'prompt', 'checklist')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.staff_attendance enable row level security;
alter table public.admin_skills enable row level security;

drop policy if exists staff_attendance_admin_read on public.staff_attendance;
create policy staff_attendance_admin_read on public.staff_attendance for select to authenticated using (public.get_my_role() = 'admin');
drop policy if exists staff_attendance_own_write on public.staff_attendance;
create policy staff_attendance_own_write on public.staff_attendance for all to authenticated
  using (public.get_my_role() = 'admin' and user_id = auth.uid())
  with check (public.get_my_role() = 'admin' and user_id = auth.uid());
drop policy if exists staff_attendance_service on public.staff_attendance;
create policy staff_attendance_service on public.staff_attendance for all to service_role using (true) with check (true);

drop policy if exists admin_skills_admin on public.admin_skills;
create policy admin_skills_admin on public.admin_skills for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
drop policy if exists admin_skills_service on public.admin_skills;
create policy admin_skills_service on public.admin_skills for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public) values ('team-files', 'team-files', false) on conflict (id) do nothing;
drop policy if exists team_files_admin on storage.objects;
create policy team_files_admin on storage.objects for all to authenticated
  using (bucket_id = 'team-files' and public.get_my_role() = 'admin')
  with check (bucket_id = 'team-files' and public.get_my_role() = 'admin');

do $$ begin
  alter publication supabase_realtime add table public.staff_attendance, public.admin_skills;
exception when others then null; end $$;
