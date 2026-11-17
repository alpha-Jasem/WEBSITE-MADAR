-- Availability and the two new conversation statuses. Builds on 20261117130000. Additive, except that
-- madar_conversation_states gains a status column (dropped and recreated; only these functions use it).
--   * company_user_presence: each person's availability. Smart assignment gives new conversations only
--     to people who are online; anyone who never set a status counts as online.
--   * Status events may now be 'waiting' (for the customer) or 'snoozed:<time>' / 'snoozed:reply'.
--     Neither counts towards a person's load or the reply limit, and both open again when the customer writes.

create table if not exists public.company_user_presence (
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid not null,
  status text not null default 'online' check (status in ('online', 'busy', 'break', 'offline')),
  updated_at timestamptz not null default now(),
  primary key (company_id, auth_user_id)
);

alter table public.company_user_presence enable row level security;
drop policy if exists company_user_presence_read on public.company_user_presence;
create policy company_user_presence_read on public.company_user_presence for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
-- Each person sets only their own status.
drop policy if exists company_user_presence_own on public.company_user_presence;
create policy company_user_presence_own on public.company_user_presence for all to authenticated
  using (auth_user_id = auth.uid() and company_id = public.get_my_clinic_company_id())
  with check (auth_user_id = auth.uid() and company_id = public.get_my_clinic_company_id());
drop policy if exists company_user_presence_service on public.company_user_presence;
create policy company_user_presence_service on public.company_user_presence for all to service_role using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.company_user_presence;
exception when others then null; end $$;

-- Current status per conversation: open, closed, waiting or snoozed (a snooze whose time passed is open again).
drop function if exists public.madar_conversation_states(uuid);
create function public.madar_conversation_states(p_company uuid)
returns table (conversation_key text, assignee uuid, team_id uuid, closed boolean, assigned_at timestamptz, status text, status_at timestamptz)
language sql stable as $$
  with own as (
    select distinct on (e.conversation_key) e.conversation_key, e.assignee_user_id, e.created_at
    from public.conversation_events e
    where e.company_id = p_company and e.kind in ('assign', 'transfer')
    order by e.conversation_key, e.created_at desc
  ), team as (
    select distinct on (e.conversation_key) e.conversation_key, e.team_id
    from public.conversation_events e
    where e.company_id = p_company and e.kind = 'transfer'
    order by e.conversation_key, e.created_at desc
  ), st as (
    select distinct on (e.conversation_key) e.conversation_key, e.body, e.created_at
    from public.conversation_events e
    where e.company_id = p_company and e.kind = 'status'
    order by e.conversation_key, e.created_at desc
  ), s as (
    select own.conversation_key, own.assignee_user_id, team.team_id, own.created_at as own_at, st.body, st.created_at as st_at,
      case
        when st.body = 'closed' then 'closed'
        when st.body = 'waiting' then 'waiting'
        when st.body like 'snoozed%' then
          case when st.body ~ '^snoozed:\d{4}-' and substr(st.body, 9)::timestamptz <= now() then 'open' else 'snoozed' end
        else 'open'
      end as status
    from own left join team using (conversation_key) left join st using (conversation_key)
  )
  select s.conversation_key, s.assignee_user_id, s.team_id, s.status = 'closed',
         case when s.assignee_user_id is not null then s.own_at end, s.status, s.st_at
  from s
$$;

-- Same pick as before, skipping people who are busy, on a break or offline.
create or replace function public.madar_pick_assignee(p_team uuid, p_exclude uuid default null)
returns uuid language plpgsql stable as $$
declare
  r public.team_assignment_rules;
  members uuid[];
  last_id uuid;
  pos int;
  n int;
  i int;
  cand uuid;
  best uuid;
  best_load int;
  loads jsonb;
begin
  select * into r from public.team_assignment_rules where team_id = p_team;
  if not found then return null; end if;
  select array_agg(m.auth_user_id order by m.created_at) into members
    from public.company_team_members m
    where m.team_id = p_team and m.auth_user_id is distinct from p_exclude
      and not exists (select 1 from public.company_user_presence p
                      where p.company_id = r.company_id and p.auth_user_id = m.auth_user_id and p.status <> 'online');
  n := coalesce(array_length(members, 1), 0);
  if n = 0 then return null; end if;
  select coalesce(jsonb_object_agg(assignee::text, c), '{}'::jsonb) into loads from (
    select s.assignee, count(*) c from public.madar_conversation_states(r.company_id) s
    where s.status = 'open' and s.assignee = any(members) group by s.assignee) x;

  if r.strategy = 'round_robin' then
    select e.assignee_user_id into last_id from public.conversation_events e
      where e.team_id = p_team and e.kind = 'transfer' and e.assignee_user_id is not null
      order by e.created_at desc limit 1;
    pos := coalesce(array_position(members, last_id), 0);
    for i in 1..n loop
      cand := members[((pos + i - 1) % n) + 1];
      if r.max_open <= 0 or coalesce((loads ->> cand::text)::int, 0) < r.max_open then return cand; end if;
    end loop;
    return null;
  end if;

  foreach cand in array members loop
    if r.max_open > 0 and coalesce((loads ->> cand::text)::int, 0) >= r.max_open then continue; end if;
    if best is null or coalesce((loads ->> cand::text)::int, 0) < best_load then
      best := cand; best_load := coalesce((loads ->> cand::text)::int, 0);
    end if;
  end loop;
  return best;
end $$;

-- Arrival: as before, plus a conversation waiting for the customer or snoozed opens again when they write.
create or replace function public.madar_assign_on_arrival()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  k text := public.madar_conversation_key(new.id, new.channel, new.phone);
  s record;
  r public.team_assignment_rules;
  pick uuid;
begin
  select * into s from public.madar_conversation_states(new.company_id) x where x.conversation_key = k;

  if not found then
    select * into r from public.team_assignment_rules where company_id = new.company_id and assign_new and enabled;
    if found then
      perform public.madar_auto_transfer(new.company_id, k, r.team_id, public.madar_pick_assignee(r.team_id), 'محادثة جديدة');
    end if;
    return new;
  end if;

  if s.status in ('waiting', 'snoozed') then
    insert into public.conversation_events (company_id, conversation_key, kind, body, author_name)
      values (new.company_id, k, 'status', 'open', 'رد العميل');
    return new;
  end if;

  if s.closed and s.team_id is not null then
    select * into r from public.team_assignment_rules where team_id = s.team_id and enabled;
    if not found or r.reopen_action = 'none' then return new; end if;
    insert into public.conversation_events (company_id, conversation_key, kind, body, author_name)
      values (new.company_id, k, 'status', 'open', 'الإسناد الذكي');
    if r.reopen_action = 'keep' and s.assignee is not null then return new; end if;
    if r.reopen_action = 'prefer_original' and s.assignee is not null
       and exists (select 1 from public.company_team_members m where m.team_id = s.team_id and m.auth_user_id = s.assignee)
       and (r.max_open <= 0 or (select count(*) from public.madar_conversation_states(new.company_id) x
                                where x.assignee = s.assignee and x.status = 'open') < r.max_open) then
      return new;
    end if;
    pick := public.madar_pick_assignee(s.team_id, case when r.reopen_action = 'reassign' then s.assignee end);
    perform public.madar_auto_transfer(new.company_id, k, s.team_id, pick, 'رجع العميل بعد الإغلاق');
  end if;
  return new;
exception when others then
  raise warning 'madar_assign_on_arrival: %', sqlerrm;
  return new;
end $$;

-- Reply-limit sweep: only open conversations count; waiting and snoozed ones are paused.
create or replace function public.madar_sla_sweep()
returns integer language plpgsql security definer set search_path = public as $$
declare
  c record;
  pick uuid;
  done int := 0;
begin
  for c in
    select r.company_id, r.team_id, r.sla_action, s.conversation_key, s.assignee, s.assigned_at
    from public.team_assignment_rules r
    cross join lateral public.madar_conversation_states(r.company_id) s
    where r.enabled and r.sla_minutes > 0 and r.sla_action <> 'notify'
      and s.team_id = r.team_id and s.assignee is not null and s.status = 'open'
      and s.assigned_at < now() - make_interval(mins => r.sla_minutes)
      and not exists (select 1 from public.conversation_events e
                      where e.company_id = r.company_id and e.conversation_key = s.conversation_key
                        and e.kind = 'reply' and e.created_at > s.assigned_at)
  loop
    pick := case when c.sla_action = 'reassign' then public.madar_pick_assignee(c.team_id, c.assignee) end;
    if c.sla_action = 'reassign' and pick is null then continue; end if;
    perform public.madar_auto_transfer(c.company_id, c.conversation_key, c.team_id, pick, 'تأخر الرد');
    done := done + 1;
  end loop;
  return done;
end $$;

revoke all on function public.madar_sla_sweep() from public, anon, authenticated;
revoke all on function public.madar_assign_on_arrival() from public, anon, authenticated;
