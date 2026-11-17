-- Smart assignment, server side: new conversations get a person the moment they arrive, closed chats that
-- come back are handled by the team's rule, and a conversation left without a reply past the team's limit
-- is moved or released by a one-minute sweep. Builds on team_assignment_rules (20261117120000). Additive only.

alter table public.team_assignment_rules
  add column if not exists assign_new boolean not null default false,
  add column if not exists assign_on_reply boolean not null default false,
  add column if not exists reopen_action text not null default 'none',
  add column if not exists sla_action text not null default 'notify';

do $$ begin
  alter table public.team_assignment_rules add constraint team_assignment_rules_reopen_check
    check (reopen_action in ('none', 'reassign', 'prefer_original', 'keep'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.team_assignment_rules add constraint team_assignment_rules_sla_action_check
    check (sla_action in ('notify', 'reassign', 'unassign'));
exception when duplicate_object then null; end $$;

-- One team per company receives the new conversations.
create unique index if not exists uq_team_assignment_rules_new
  on public.team_assignment_rules (company_id) where assign_new;

-- Same key the inbox uses: one thread per WhatsApp number, one item per call otherwise.
create or replace function public.madar_conversation_key(p_id uuid, p_channel text, p_phone text)
returns text language sql immutable as $$
  select case
    when coalesce(p_channel, 'phone') = 'whatsapp' and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
      then 'chat:' || (case when regexp_replace(p_phone, '\D', '', 'g') like '966%'
                            then '0' || substr(regexp_replace(p_phone, '\D', '', 'g'), 4)
                            else regexp_replace(p_phone, '\D', '', 'g') end)
    else 'call:' || p_id::text
  end
$$;

-- Each conversation's current owner and status, from its events (mirrors convState in the inbox).
create or replace function public.madar_conversation_states(p_company uuid)
returns table (conversation_key text, assignee uuid, team_id uuid, closed boolean, assigned_at timestamptz)
language sql stable as $$
  with own as (
    select distinct on (e.conversation_key) e.conversation_key, e.assignee_user_id, e.team_id, e.kind, e.created_at
    from public.conversation_events e
    where e.company_id = p_company and e.kind in ('assign', 'transfer')
    order by e.conversation_key, e.created_at desc
  ), team as (
    select distinct on (e.conversation_key) e.conversation_key, e.team_id
    from public.conversation_events e
    where e.company_id = p_company and e.kind = 'transfer'
    order by e.conversation_key, e.created_at desc
  ), st as (
    select distinct on (e.conversation_key) e.conversation_key, e.body
    from public.conversation_events e
    where e.company_id = p_company and e.kind = 'status'
    order by e.conversation_key, e.created_at desc
  )
  select own.conversation_key, own.assignee_user_id, team.team_id, coalesce(st.body = 'closed', false),
         case when own.assignee_user_id is not null then own.created_at end
  from own left join team using (conversation_key) left join st using (conversation_key)
$$;

-- The member who should get the team's next conversation, or null (mirrors pickAssignee in src/lib/assignment.ts).
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
    from public.company_team_members m where m.team_id = p_team and m.auth_user_id is distinct from p_exclude;
  n := coalesce(array_length(members, 1), 0);
  if n = 0 then return null; end if;
  select coalesce(jsonb_object_agg(assignee::text, c), '{}'::jsonb) into loads from (
    select s.assignee, count(*) c from public.madar_conversation_states(r.company_id) s
    where not s.closed and s.assignee = any(members) group by s.assignee) x;

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

create or replace function public.madar_member_name(p_company uuid, p_user uuid)
returns text language sql stable as $$
  select full_name from public.company_users where company_id = p_company and auth_user_id = p_user limit 1
$$;

-- Hand a conversation to a team (and a person when one is free), written as a normal transfer event.
create or replace function public.madar_auto_transfer(p_company uuid, p_key text, p_team uuid, p_user uuid, p_note text)
returns void language plpgsql as $$
begin
  insert into public.conversation_events (company_id, conversation_key, kind, body, team_id, team_name, assignee_user_id, assignee_name, author_name)
  select p_company, p_key, 'transfer', p_note, t.id, t.name, p_user, public.madar_member_name(p_company, p_user), 'الإسناد الذكي'
  from public.company_teams t where t.id = p_team;
end $$;

-- A conversation arrives: new ones go to the company's intake team; a closed chat that comes back follows its team's rule.
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

  if s.closed and s.team_id is not null then
    select * into r from public.team_assignment_rules where team_id = s.team_id and enabled;
    if not found or r.reopen_action = 'none' then return new; end if;
    insert into public.conversation_events (company_id, conversation_key, kind, body, author_name)
      values (new.company_id, k, 'status', 'open', 'الإسناد الذكي');
    if r.reopen_action = 'keep' and s.assignee is not null then return new; end if;
    if r.reopen_action = 'prefer_original' and s.assignee is not null
       and exists (select 1 from public.company_team_members m where m.team_id = s.team_id and m.auth_user_id = s.assignee)
       and (r.max_open <= 0 or (select count(*) from public.madar_conversation_states(new.company_id) x
                                where x.assignee = s.assignee and not x.closed) < r.max_open) then
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

drop trigger if exists trg_madar_assign_on_arrival on public.clinic_os_ai_calls;
create trigger trg_madar_assign_on_arrival after insert on public.clinic_os_ai_calls
  for each row execute function public.madar_assign_on_arrival();

-- Every minute: an assigned, open conversation with no team reply past its team's limit is moved or released.
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
      and s.team_id = r.team_id and s.assignee is not null and not s.closed
      and s.assigned_at < now() - make_interval(mins => r.sla_minutes)
      and not exists (select 1 from public.conversation_events e
                      where e.company_id = r.company_id and e.conversation_key = s.conversation_key
                        and e.kind = 'reply' and e.created_at > s.assigned_at)
  loop
    pick := case when c.sla_action = 'reassign' then public.madar_pick_assignee(c.team_id, c.assignee) end;
    -- Reassign with nobody free keeps the current person rather than dropping the conversation.
    if c.sla_action = 'reassign' and pick is null then continue; end if;
    perform public.madar_auto_transfer(c.company_id, c.conversation_key, c.team_id, pick, 'تأخر الرد');
    done := done + 1;
  end loop;
  return done;
end $$;

revoke all on function public.madar_sla_sweep() from public, anon, authenticated;
revoke all on function public.madar_assign_on_arrival() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('madar-sla-sweep');
exception when others then null; end $$;
select cron.schedule('madar-sla-sweep', '* * * * *', $cron$ select public.madar_sla_sweep(); $cron$);
