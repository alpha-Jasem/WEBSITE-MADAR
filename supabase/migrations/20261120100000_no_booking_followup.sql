-- New automation trigger: conversation.no_booking.
-- A customer asked about a booking or a price, the conversation ended without a booking, and the rule's
-- waiting time (hours, default 24, at least 1) has passed. One event per rule per customer, and only for
-- conversations from the last 3 days and newer than the rule itself, so turning a rule on never fires for
-- old history. Additive: the trigger list is extended and one sweep function and cron job are added.

alter table public.connect_rules drop constraint if exists connect_rules_trigger_event_check;
alter table public.connect_rules add constraint connect_rules_trigger_event_check check (trigger_event in (
  'conversation.new', 'conversation.needs_review', 'conversation.transferred', 'conversation.reopened', 'conversation.no_reply',
  'conversation.no_booking',
  'ticket.created', 'booking.created', 'customer.created', 'review.new',
  'order.created', 'order.status_changed', 'cart.abandoned', 'form.submitted'));

create or replace function public.connect_no_booking_sweep() returns integer
language plpgsql security definer set search_path = public as $$
declare
  r record;
  c record;
  n int := 0;
begin
  for r in select id, company_id, created_at, greatest(1, coalesce((conditions ->> 'hours')::int, 24)) as hours
           from public.connect_rules where trigger_event = 'conversation.no_booking' and enabled
  loop
    for c in
      with latest as (
        select distinct on (regexp_replace(coalesce(a.phone, ''), '\D', '', 'g'))
          regexp_replace(coalesce(a.phone, ''), '\D', '', 'g') as digits,
          a.id, a.phone, a.caller_name, a.channel, a.summary, a.intent, a.result, a.appointment_id,
          coalesce(a.call_time, a.created_at) as at
        from public.clinic_os_ai_calls a
        where a.company_id = r.company_id
          and coalesce(a.phone, '') <> ''
          and coalesce(a.call_time, a.created_at) > greatest(r.created_at, now() - interval '3 days')
        order by regexp_replace(coalesce(a.phone, ''), '\D', '', 'g'), coalesce(a.call_time, a.created_at) desc
      )
      select l.* from latest l
      where l.at < now() - make_interval(hours => r.hours)
        and l.digits <> ''
        and l.appointment_id is null
        and coalesce(l.intent, 'inquiry') in ('new_booking', 'inquiry')
        and coalesce(l.result, 'no_action') not in ('booked', 'rescheduled', 'cancelled')
        and not exists (select 1 from public.clinic_os_ai_calls b where b.company_id = r.company_id
                        and regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') = l.digits
                        and (b.result in ('booked', 'rescheduled') or b.appointment_id is not null)
                        and coalesce(b.call_time, b.created_at) >= l.at - interval '1 day')
        and not exists (select 1 from public.connect_events x where x.company_id = r.company_id and x.event = 'conversation.no_booking'
                        and x.payload ->> 'rule_id' = r.id::text and x.payload -> 'customer' ->> 'digits' = l.digits
                        and x.created_at > now() - interval '3 days')
    loop
      insert into public.connect_events (company_id, event, payload) values (r.company_id, 'conversation.no_booking', jsonb_build_object(
        'rule_id', r.id,
        'conversation', jsonb_build_object('id', c.id, 'phone', c.phone, 'name', c.caller_name, 'channel', c.channel, 'summary', c.summary, 'intent', c.intent),
        'customer', jsonb_build_object('name', c.caller_name, 'phone', c.phone, 'digits', c.digits),
        'hours_since', floor(extract(epoch from (now() - c.at)) / 3600)::int));
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.connect_no_booking_sweep() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('connect-no-booking-sweep');
exception when others then null; end $$;
select cron.schedule('connect-no-booking-sweep', '*/10 * * * *', $cron$ select public.connect_no_booking_sweep(); $cron$);
