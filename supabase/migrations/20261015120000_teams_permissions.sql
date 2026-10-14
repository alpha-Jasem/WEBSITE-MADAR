-- Teams, conversation transfer between teams, and per-member permissions. Additive only.

create table if not exists public.company_teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  color text not null default '#7aa2ff',
  description text,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.company_team_members (
  team_id uuid not null references public.company_teams(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (team_id, auth_user_id)
);
create index if not exists idx_team_members_user on public.company_team_members (company_id, auth_user_id);

alter table public.company_teams enable row level security;
alter table public.company_team_members enable row level security;

-- Everyone in the company reads teams (the inbox needs them); only the account owner changes them.
drop policy if exists company_teams_read on public.company_teams;
create policy company_teams_read on public.company_teams for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
drop policy if exists company_teams_owner_write on public.company_teams;
create policy company_teams_owner_write on public.company_teams for all to authenticated
  using (company_id in (select id from public.companies where auth_user_id = auth.uid()))
  with check (company_id in (select id from public.companies where auth_user_id = auth.uid()));
drop policy if exists company_teams_service on public.company_teams;
create policy company_teams_service on public.company_teams for all to service_role using (true) with check (true);

drop policy if exists team_members_read on public.company_team_members;
create policy team_members_read on public.company_team_members for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
drop policy if exists team_members_owner_write on public.company_team_members;
create policy team_members_owner_write on public.company_team_members for all to authenticated
  using (company_id in (select id from public.companies where auth_user_id = auth.uid()))
  with check (company_id in (select id from public.companies where auth_user_id = auth.uid()));
drop policy if exists team_members_service on public.company_team_members;
create policy team_members_service on public.company_team_members for all to service_role using (true) with check (true);

-- Conversation transfers: an event that hands a conversation to a team (optionally to one person in it).
alter table public.conversation_events add column if not exists team_id uuid references public.company_teams(id) on delete set null;
alter table public.conversation_events add column if not exists team_name text;
alter table public.conversation_events drop constraint if exists conversation_events_kind_check;
alter table public.conversation_events add constraint conversation_events_kind_check
  check (kind in ('note', 'status', 'assign', 'reply', 'transfer'));

-- A transfer tells the receiving side: one company notification the dashboard shows in the bell.
create or replace function public.notify_conversation_transfer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'transfer' then
    begin
      insert into public.clinic_os_notifications (company_id, notification_type, title, message, severity, route)
      values (new.company_id, 'conversation_transfer',
        'محادثة محوّلة إلى ' || coalesce(new.team_name, 'فريق'),
        coalesce(new.author_name, 'أحد الفريق') || ' حوّل محادثة' || case when coalesce(new.body, '') <> '' then ': ' || new.body else '' end,
        'info', 'conversations?sel=' || new.conversation_key);
    exception when others then null;
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_conversation_transfer on public.conversation_events;
create trigger trg_notify_conversation_transfer after insert on public.conversation_events
  for each row execute function public.notify_conversation_transfer();

alter table public.conversation_events add column if not exists assignee_name text;
