-- Every stored conversation now feeds the rest of the dashboard on its own. Each step is isolated
-- so it can never block a call from being stored.
--   clinic_os_after_call_insert : bell notification, follow-up ticket (customer asked for a call-back /
--                                 follow-up and left a number), unanswered questions for the knowledge
--                                 base, WhatsApp integration flips to connected
--   clinic_os_usage_after_call  : monthly usage counters (WhatsApp conversations, agent replies, minutes, hand-offs)
--   clinic_os_visit_from_call   : a visit request becomes a pending appointment (date/time read from Arabic text)
-- Applied to the project in steps; this file is the consolidated record.

create or replace function public.clinic_os_after_call_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  d jsonb := coalesce(new.analysis -> 'data', '{}'::jsonb);
  v_name text;
  v_phone text;
  v_stated text;
  v_next text;
  v_follow text;
  v_wants boolean;
begin
  begin
    v_name := coalesce(nullif(new.caller_name, ''), nullif(d -> 'customer_name' ->> 'value', ''), nullif(new.phone, 'unknown'), 'عميل');
    v_phone := nullif(nullif(new.phone, ''), 'unknown');
    v_stated := nullif(d -> 'contact_number' ->> 'value', '');
    v_next := nullif(d -> 'requested_next_step' ->> 'value', '');
    v_follow := nullif(d -> 'follow_up_needed' ->> 'value', '');
    v_wants := v_next is not null or (v_follow is not null and lower(v_follow) not in ('false', 'no', 'none') and v_follow !~ '^(لا|ما|غير)');
  exception when others then return new;
  end;

  begin
    insert into public.clinic_os_notifications (company_id, notification_type, title, message, severity, route)
    values (new.company_id, 'new_conversation', 'محادثة جديدة', v_name || ' — ' || left(coalesce(new.summary, ''), 90),
            case when new.status = 'needs_review' then 'warning' else 'info' end, '/conversations?id=call:' || new.id);
  exception when others then null;
  end;

  begin
    if new.status <> 'needs_review' and coalesce(v_stated, v_phone) is not null and v_wants then
      insert into public.ai_agent_support_tickets
        (company_id, subject, description, route, priority, status, ai_call_id, customer_name, customer_phone, ticket_type)
      values (new.company_id, coalesce(v_next, 'متابعة طلب العميل'),
              coalesce(new.summary, 'العميل طلب متابعة من الفريق.') || case when v_stated is not null and v_phone is not null and v_stated <> v_phone then E'\nرقم تواصل ذكره العميل: ' || v_stated else '' end,
              'ai-receptionist', 'normal', 'open', new.id, v_name, coalesce(v_stated, v_phone),
              case when coalesce(v_next, '') like '%اتصال%' then 'طلب اتصال' else 'متابعة' end)
      on conflict (ai_call_id) do nothing;
    end if;
  exception when others then null;
  end;

  begin
    if jsonb_typeof(new.transcript) = 'array' then
      insert into public.agent_unanswered_questions (company_id, question, count, last_asked_at, ai_call_id)
      select distinct on (lower(s.ptx)) new.company_id, s.ptx, 1, coalesce(new.call_time, now()), new.id
      from (
        select e ->> 'speaker' as sp, e ->> 'text' as tx, lag(e ->> 'speaker') over (order by ord) as psp, lag(e ->> 'text') over (order by ord) as ptx
        from jsonb_array_elements(new.transcript) with ordinality as t(e, ord)
      ) s
      where s.sp = 'agent' and s.psp in ('patient', 'user', 'customer') and length(coalesce(s.ptx, '')) > 6
        and s.tx ~ 'ما (عندي|أعرف|اعرف|أملك|املك|توفر)|لا (أملك|املك|أعرف|اعرف)|ما أقدر أجاوب|ما لدي معلومات|خارج نطاق'
      order by lower(s.ptx)
      limit 3
      on conflict (company_id, lower(question)) do update
        set count = public.agent_unanswered_questions.count + 1, last_asked_at = excluded.last_asked_at, answered_at = null;
    end if;
  exception when others then null;
  end;

  begin
    if new.channel = 'whatsapp' then
      insert into public.clinic_os_integrations (company_id, provider, name, status, connected_at)
      values (new.company_id, 'whatsapp', 'WhatsApp Business', 'connected', now())
      on conflict (company_id, provider) do update set status = 'connected', connected_at = coalesce(public.clinic_os_integrations.connected_at, now());
    end if;
  exception when others then null;
  end;
  return new;
end $$;

create or replace function public.clinic_os_usage_after_call() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_start date := date_trunc('month', coalesce(new.call_time, now()))::date;
  v_agent_turns int := 0;
begin
  begin
    if jsonb_typeof(new.transcript) = 'array' then
      select count(*) into v_agent_turns from jsonb_array_elements(new.transcript) e where e ->> 'speaker' = 'agent';
    end if;
    insert into public.clinic_os_usage (company_id, cycle_start, cycle_end, whatsapp_conversations_used, ai_messages_used, smart_call_minutes_used, human_handoffs)
    values (new.company_id, v_start, (v_start + interval '1 month - 1 day')::date,
            case when new.channel = 'whatsapp' then 1 else 0 end, v_agent_turns,
            case when new.channel = 'phone' then ceil(coalesce(new.duration_seconds, 0) / 60.0)::int else 0 end,
            case when new.needs_review then 1 else 0 end)
    on conflict (company_id, cycle_start) do update set
      whatsapp_conversations_used = public.clinic_os_usage.whatsapp_conversations_used + excluded.whatsapp_conversations_used,
      ai_messages_used = public.clinic_os_usage.ai_messages_used + excluded.ai_messages_used,
      smart_call_minutes_used = public.clinic_os_usage.smart_call_minutes_used + excluded.smart_call_minutes_used,
      human_handoffs = public.clinic_os_usage.human_handoffs + excluded.human_handoffs,
      updated_at = now();
  exception when others then null;
  end;
  return new;
end $$;

create or replace function public.clinic_os_visit_from_call(p_call public.clinic_os_ai_calls) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  d jsonb := coalesce(p_call.analysis -> 'data', '{}'::jsonb);
  v_pref text := nullif(d -> 'visit_preference' ->> 'value', '');
  v_next text := nullif(d -> 'requested_next_step' ->> 'value', '');
  v_alt text := nullif(d -> 'preferred_time' ->> 'value', '');
  v_name text;
  v_phone text;
  v_txt text;
  base_day date;
  v_day date;
  v_hr int;
  v_mn int := 0;
  v_m text[];
  v_days text[] := array['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  i int;
begin
  if not (coalesce(v_next, '') ~ 'زيار|معاينة' or v_pref is not null) then return; end if;
  v_name := coalesce(nullif(p_call.caller_name, ''), nullif(d -> 'customer_name' ->> 'value', ''), nullif(p_call.phone, 'unknown'), 'عميل');
  v_phone := coalesce(nullif(d -> 'contact_number' ->> 'value', ''), nullif(nullif(p_call.phone, ''), 'unknown'), '');
  v_txt := translate(coalesce(v_pref, v_alt, v_next, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789');
  base_day := (coalesce(p_call.call_time, now()) at time zone 'Asia/Riyadh')::date;
  v_day := base_day + 1;
  if v_txt ~ 'بعد (بكرة|بكرا|غد)' then v_day := base_day + 2;
  elsif v_txt ~ 'بكرة|بكرا|غدا|غداً|غدًا' then v_day := base_day + 1;
  elsif v_txt ~ 'اليوم' then v_day := base_day;
  else
    for i in 1..7 loop
      if v_txt like '%' || v_days[i] || '%' then
        v_day := base_day + ((i - 1 - extract(dow from base_day)::int + 7) % 7);
        if v_day = base_day then v_day := base_day + 7; end if;
      end if;
    end loop;
  end if;
  v_m := regexp_match(v_txt, '(\d{1,2})(?::(\d{2}))?');
  v_hr := coalesce(v_m[1]::int, 10);
  if v_m[2] is not null then v_mn := v_m[2]::int; end if;
  if v_hr < 12 and v_txt ~ 'مساء|عصر|العصر|المغرب|العشاء|بعد الظهر|ليل' then v_hr := v_hr + 12;
  elsif v_hr between 1 and 6 and v_txt ~ 'الظهر' then v_hr := v_hr + 12;
  end if;
  if v_hr > 22 or v_mn > 59 then v_hr := 10; v_mn := 0; end if;

  insert into public.clinic_os_appointments
    (company_id, patient_name, patient_phone, appointment_date, start_time, end_time, duration_minutes, service_name,
     status, source, confirmation_status, message_status, calendar_sync_status, needs_review_reason, notes, source_ref_id)
  values (p_call.company_id, v_name, v_phone, v_day, make_time(v_hr, v_mn, 0), make_time(v_hr + 1, v_mn, 0), 60, 'زيارة المشروع',
          'pending', 'ai_booking', 'pending', 'pending', 'pending', 'طلب زيارة من الوكيل، يحتاج تأكيد من الفريق', left(coalesce(p_call.summary, ''), 400), p_call.id)
  on conflict (source_ref_id) do nothing;
end $$;

create or replace function public.clinic_os_visit_trigger() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  begin
    perform public.clinic_os_visit_from_call(new);
  exception when others then null;
  end;
  return new;
end $$;

create trigger trg_clinic_os_after_call_insert after insert on public.clinic_os_ai_calls for each row execute function public.clinic_os_after_call_insert();
create trigger trg_clinic_os_usage_after_call after insert on public.clinic_os_ai_calls for each row execute function public.clinic_os_usage_after_call();
create trigger trg_clinic_os_visit_after_call after insert on public.clinic_os_ai_calls for each row execute function public.clinic_os_visit_trigger();

alter publication supabase_realtime add table public.conversation_events;
