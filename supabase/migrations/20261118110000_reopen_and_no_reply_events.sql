-- Two more automation triggers, and the trigger list for lead forms. Additive, except connect_on_call is replaced.
--   * conversation.reopened  a customer writes again after their conversation was closed, or after 7+ quiet days.
--   * conversation.no_reply  a conversation that needs your team (flagged for review, or assigned to someone)
--                            got no reply from the team within the minutes set on the rule.
--   * form.submitted         someone filled a lead form on the company's website (lead_forms, next migration).
-- connect_on_call now builds the conversation key with madar_conversation_key, the same key the inbox uses,
-- so "transfer to a team" from an automation lands on the right inbox thread.

alter table public.connect_rules drop constraint if exists connect_rules_trigger_event_check;
alter table public.connect_rules add constraint connect_rules_trigger_event_check check (trigger_event in (
  'conversation.new', 'conversation.needs_review', 'conversation.transferred', 'conversation.reopened', 'conversation.no_reply',
  'ticket.created', 'booking.created', 'customer.created', 'review.new',
  'order.created', 'order.status_changed', 'cart.abandoned', 'form.submitted'));

create or replace function public.connect_on_call() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text := public.madar_conversation_key(new.id, new.channel, new.phone);
  digits text := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  prev_at timestamptz;
  was_closed boolean := false;
begin
  begin
    if tg_op = 'INSERT' then
      perform public.queue_connect_event(new.company_id, 'conversation.new', jsonb_build_object(
        'conversation', jsonb_build_object('id', new.id, 'key', k,
          'phone', new.phone, 'name', new.caller_name, 'channel', new.channel, 'summary', new.summary, 'intent', new.intent, 'needs_review', new.needs_review)));

      -- Returning customer: same number wrote before, and the thread was closed or quiet for a week.
      if digits <> '' and exists (select 1 from public.connect_rules where company_id = new.company_id and trigger_event = 'conversation.reopened' and enabled) then
        select max(coalesce(c.call_time, c.created_at)) into prev_at from public.clinic_os_ai_calls c
          where c.company_id = new.company_id and c.id <> new.id
            and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = digits;
        if prev_at is not null then
          select coalesce(s.closed, false) into was_closed from public.madar_conversation_states(new.company_id) s where s.conversation_key = k;
          if coalesce(was_closed, false) or prev_at < coalesce(new.call_time, now()) - interval '7 days' then
            perform public.queue_connect_event(new.company_id, 'conversation.reopened', jsonb_build_object(
              'conversation', jsonb_build_object('id', new.id, 'key', k, 'phone', new.phone, 'name', new.caller_name, 'channel', new.channel, 'summary', new.summary),
              'customer', jsonb_build_object('name', new.caller_name, 'phone', new.phone),
              'days_away', greatest(0, floor(extract(epoch from (coalesce(new.call_time, now()) - prev_at)) / 86400))::int,
              'was_closed', coalesce(was_closed, false)));
          end if;
        end if;
      end if;
    end if;
    if new.needs_review is true and (tg_op = 'INSERT' or old.needs_review is distinct from true) then
      perform public.queue_connect_event(new.company_id, 'conversation.needs_review', jsonb_build_object(
        'conversation', jsonb_build_object('id', new.id, 'key', k,
          'phone', new.phone, 'name', new.caller_name, 'channel', new.channel, 'summary', new.summary, 'reason', new.review_reason)));
    end if;
  exception when others then null;
  end;
  return new;
end $$;

-- No reply in time: one event per rule per conversation. Only conversations from the last day and newer
-- than the rule itself count, so turning a rule on never fires for old history.
create or replace function public.connect_no_reply_sweep() returns integer
language plpgsql security definer set search_path = public as $$
declare
  r record;
  c record;
  n int := 0;
begin
  for r in select id, company_id, created_at, greatest(5, coalesce((conditions ->> 'minutes')::int, 30)) as minutes
           from public.connect_rules where trigger_event = 'conversation.no_reply' and enabled
  loop
    for c in
      with latest as (
        select distinct on (public.madar_conversation_key(a.id, a.channel, a.phone))
          public.madar_conversation_key(a.id, a.channel, a.phone) as k, a.id, a.phone, a.caller_name, a.channel, a.summary, a.needs_review,
          coalesce(a.call_time, a.created_at) as at
        from public.clinic_os_ai_calls a
        where a.company_id = r.company_id and coalesce(a.call_time, a.created_at) > greatest(r.created_at, now() - interval '1 day')
        order by public.madar_conversation_key(a.id, a.channel, a.phone), coalesce(a.call_time, a.created_at) desc
      )
      select l.*, s.assignee, s.status from latest l
      left join public.madar_conversation_states(r.company_id) s on s.conversation_key = l.k
      where l.at < now() - make_interval(mins => r.minutes)
        and coalesce(s.status, 'open') = 'open'
        and (l.needs_review is true or s.assignee is not null)
        and not exists (select 1 from public.conversation_events e where e.company_id = r.company_id and e.conversation_key = l.k and e.kind = 'reply' and e.created_at > l.at)
        and not exists (select 1 from public.connect_events x where x.company_id = r.company_id and x.event = 'conversation.no_reply'
                        and x.payload ->> 'rule_id' = r.id::text and x.payload -> 'conversation' ->> 'id' = l.id::text)
    loop
      insert into public.connect_events (company_id, event, payload) values (r.company_id, 'conversation.no_reply', jsonb_build_object(
        'rule_id', r.id,
        'conversation', jsonb_build_object('id', c.id, 'key', c.k, 'phone', c.phone, 'name', c.caller_name, 'channel', c.channel, 'summary', c.summary),
        'customer', jsonb_build_object('name', c.caller_name, 'phone', c.phone),
        'waited_minutes', floor(extract(epoch from (now() - c.at)) / 60)::int));
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.connect_no_reply_sweep() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('connect-no-reply-sweep');
exception when others then null; end $$;
-- The one-minute connect-sweep hands the queued events to the runner.
select cron.schedule('connect-no-reply-sweep', '*/2 * * * *', $cron$ select public.connect_no_reply_sweep(); $cron$);
