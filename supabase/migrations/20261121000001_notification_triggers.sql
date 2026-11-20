-- In-app notifications created by the database itself, so they appear even when no one has the dashboard open.
-- Additive: new functions and triggers only. Each writes one row into clinic_os_notifications for the same company,
-- and never blocks the original write (errors are swallowed).

create or replace function public.notify_company(p_company uuid, p_type text, p_title text, p_message text, p_severity text, p_route text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_company is null then return; end if;
  insert into public.clinic_os_notifications (company_id, notification_type, title, message, severity, route)
  values (p_company, p_type, p_title, p_message, p_severity, p_route);
exception when others then null;
end $$;

-- New conversation (a call row is one conversation, on any channel)
create or replace function public.notify_new_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_company(new.company_id, 'new_conversation', 'محادثة جديدة',
    coalesce(nullif(new.caller_name, ''), nullif(new.phone, ''), 'عميل') || ' بدأ محادثة جديدة', 'info', 'conversations');
  return new;
end $$;
drop trigger if exists trg_notify_new_conversation on public.clinic_os_ai_calls;
create trigger trg_notify_new_conversation after insert on public.clinic_os_ai_calls
  for each row execute function public.notify_new_conversation();

-- Conversation needs a person's review
create or replace function public.notify_needs_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.needs_review is true and (tg_op = 'INSERT' or coalesce(old.needs_review, false) = false) then
    perform public.notify_company(new.company_id, 'needs_review', 'محادثة تحتاج مراجعتك',
      coalesce(nullif(new.caller_name, ''), nullif(new.phone, ''), 'عميل') || coalesce(': ' || nullif(new.review_reason, ''), ''), 'warning', 'conversations');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_needs_review on public.clinic_os_ai_calls;
create trigger trg_notify_needs_review after insert or update of needs_review on public.clinic_os_ai_calls
  for each row execute function public.notify_needs_review();

-- Ticket assigned to someone
create or replace function public.notify_ticket_assigned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_user_id is not null and new.assignee_user_id is distinct from old.assignee_user_id then
    perform public.notify_company(new.company_id, 'ticket_assigned', 'تذكرة أُسندت',
      coalesce(new.subject, 'تذكرة') || coalesce(' · إلى ' || nullif(new.assignee_name, ''), ''), 'info', 'tickets');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_ticket_assigned on public.ai_agent_support_tickets;
create trigger trg_notify_ticket_assigned after update of assignee_user_id on public.ai_agent_support_tickets
  for each row execute function public.notify_ticket_assigned();

-- Campaign finished
create or replace function public.notify_campaign_finished() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    perform public.notify_company(new.company_id, 'campaign_finished', 'انتهت الحملة',
      'الحملة «' || coalesce(new.name, '') || '» اكتمل إرسالها', 'success', 'campaigns');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_campaign_finished on public.client_campaigns;
create trigger trg_notify_campaign_finished after update of status on public.client_campaigns
  for each row execute function public.notify_campaign_finished();

-- An automation rule failed
create or replace function public.notify_automation_failed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from 'ok' then
    perform public.notify_company(new.company_id, 'automation_failed', 'فشلت قاعدة أتمتة',
      coalesce(nullif(left(new.detail, 140), ''), 'تعذّر تنفيذ قاعدة. راجع آخر التشغيلات.'), 'critical', 'connect');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_automation_failed on public.connect_runs;
create trigger trg_notify_automation_failed after insert on public.connect_runs
  for each row execute function public.notify_automation_failed();
