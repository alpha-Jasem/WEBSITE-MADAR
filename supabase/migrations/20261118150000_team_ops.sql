-- Internal team tools for the admin dashboard (admins only): meetings with availability, and team chat.
-- Additive only. Everything here is readable and writable only by users whose role is 'admin'.
--   * staff_availability: each team member's weekly hours, so meetings can be spread by availability.
--   * meetings: meetings with prospects (from the website, WhatsApp, or added by hand).
--   * team_messages: chat inside the team; to_id empty means the whole team.

create table if not exists public.staff_availability (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- 7 entries, index 0 = Sunday: { on, from: "HH:MM", to: "HH:MM" }
  days jsonb not null default '[{"on":true,"from":"10:00","to":"17:00"},{"on":true,"from":"10:00","to":"17:00"},{"on":true,"from":"10:00","to":"17:00"},{"on":true,"from":"10:00","to":"17:00"},{"on":true,"from":"10:00","to":"17:00"},{"on":false,"from":"10:00","to":"17:00"},{"on":false,"from":"10:00","to":"17:00"}]'::jsonb,
  duration_min integer not null default 30 check (duration_min in (15, 30, 45, 60)),
  email_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  contact_name text not null check (length(trim(contact_name)) > 0),
  phone text,
  email text,
  service text,
  starts_at timestamptz not null,
  duration_min integer not null default 30,
  host_id uuid references auth.users(id) on delete set null,
  status text not null default 'upcoming' check (status in ('upcoming', 'done', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'site', 'whatsapp')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_meetings_starts on public.meetings (starts_at desc);
create index if not exists idx_meetings_host on public.meetings (host_id, starts_at);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_team_messages_to on public.team_messages (to_id, created_at desc);
create index if not exists idx_team_messages_from on public.team_messages (from_id, created_at desc);

alter table public.staff_availability enable row level security;
alter table public.meetings enable row level security;
alter table public.team_messages enable row level security;

-- Admins only. Each person edits only their own availability and sends only as themselves.
drop policy if exists staff_availability_admin_read on public.staff_availability;
create policy staff_availability_admin_read on public.staff_availability for select to authenticated using (public.get_my_role() = 'admin');
drop policy if exists staff_availability_own_write on public.staff_availability;
create policy staff_availability_own_write on public.staff_availability for all to authenticated
  using (public.get_my_role() = 'admin' and user_id = auth.uid())
  with check (public.get_my_role() = 'admin' and user_id = auth.uid());

drop policy if exists meetings_admin on public.meetings;
create policy meetings_admin on public.meetings for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

drop policy if exists team_messages_admin_read on public.team_messages;
create policy team_messages_admin_read on public.team_messages for select to authenticated
  using (public.get_my_role() = 'admin' and (to_id is null or to_id = auth.uid() or from_id = auth.uid()));
drop policy if exists team_messages_admin_send on public.team_messages;
create policy team_messages_admin_send on public.team_messages for insert to authenticated
  with check (public.get_my_role() = 'admin' and from_id = auth.uid());
drop policy if exists team_messages_admin_mark on public.team_messages;
create policy team_messages_admin_mark on public.team_messages for update to authenticated
  using (public.get_my_role() = 'admin' and to_id = auth.uid())
  with check (public.get_my_role() = 'admin' and to_id = auth.uid());

drop policy if exists staff_availability_service on public.staff_availability;
create policy staff_availability_service on public.staff_availability for all to service_role using (true) with check (true);
drop policy if exists meetings_service on public.meetings;
create policy meetings_service on public.meetings for all to service_role using (true) with check (true);
drop policy if exists team_messages_service on public.team_messages;
create policy team_messages_service on public.team_messages for all to service_role using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.meetings, public.team_messages;
exception when others then null; end $$;
