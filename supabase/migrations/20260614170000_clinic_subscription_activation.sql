create or replace function public.admin_activate_clinic_subscription(
  p_company_id uuid,
  p_plan_code text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_whatsapp_limit integer;
  v_ai_limit integer;
  v_call_limit integer;
  v_reminder_limit integer;
  v_cycle_start date := current_date;
  v_cycle_end date := (current_date + interval '1 month - 1 day')::date;
  v_subscription_end date := (current_date + interval '1 year')::date;
begin
  if p_plan_code not in ('whatsapp', 'ai_pro') then
    raise exception 'invalid_clinic_plan';
  end if;

  select * into v_company
  from public.companies
  where id = p_company_id
    and (industry = 'clinic' or business_type = 'clinic')
  for update;

  if not found then
    raise exception 'clinic_company_not_found';
  end if;

  if p_plan_code = 'whatsapp' then
    v_whatsapp_limit := 1500;
    v_ai_limit := 3000;
    v_call_limit := 0;
    v_reminder_limit := 500;
  else
    v_whatsapp_limit := 2500;
    v_ai_limit := 5000;
    v_call_limit := 300;
    v_reminder_limit := 700;
  end if;

  update public.companies
  set status = 'active',
      plan = case when p_plan_code = 'ai_pro' then 'enterprise' else 'growth' end,
      package_type = p_plan_code,
      clinic_plan_code = p_plan_code,
      subscription_status = 'active',
      subscription_start_date = current_date,
      subscription_end_date = v_subscription_end,
      monthly_usage_cycle_start = v_cycle_start,
      monthly_usage_cycle_end = v_cycle_end,
      trial_ends_at = null,
      manual_override_status = 'active',
      payment_provider = coalesce(payment_provider, 'manual'),
      last_payment_status = 'paid',
      last_payment_at = now(),
      updated_at = now()
  where id = p_company_id;

  insert into public.clinic_os_usage_limits (
    company_id,
    whatsapp_conversations_limit,
    ai_messages_limit,
    smart_call_minutes_limit,
    appointment_reminders_limit,
    extra_whatsapp_conversations,
    extra_ai_messages,
    extra_smart_call_minutes,
    extra_appointment_reminders,
    extra_limits_expire_at,
    updated_by_admin_id,
    updated_at
  ) values (
    p_company_id,
    v_whatsapp_limit,
    v_ai_limit,
    v_call_limit,
    v_reminder_limit,
    0, 0, 0, 0, null, p_actor_id, now()
  )
  on conflict (company_id) do update set
    whatsapp_conversations_limit = excluded.whatsapp_conversations_limit,
    ai_messages_limit = excluded.ai_messages_limit,
    smart_call_minutes_limit = excluded.smart_call_minutes_limit,
    appointment_reminders_limit = excluded.appointment_reminders_limit,
    extra_whatsapp_conversations = 0,
    extra_ai_messages = 0,
    extra_smart_call_minutes = 0,
    extra_appointment_reminders = 0,
    extra_limits_expire_at = null,
    updated_by_admin_id = p_actor_id,
    updated_at = now();

  insert into public.clinic_os_usage (
    company_id, cycle_start, cycle_end, updated_at
  ) values (
    p_company_id, v_cycle_start, v_cycle_end, now()
  )
  on conflict (company_id, cycle_start) do update set
    cycle_end = excluded.cycle_end,
    updated_at = now();

  insert into public.clinic_os_audit_logs (
    company_id, actor_type, actor_id, action, old_value, new_value, note
  ) values (
    p_company_id,
    'admin',
    p_actor_id,
    'subscription_activated',
    jsonb_build_object(
      'status', v_company.status,
      'subscription_status', v_company.subscription_status,
      'plan', v_company.clinic_plan_code
    ),
    jsonb_build_object(
      'status', 'active',
      'subscription_status', 'active',
      'plan', p_plan_code,
      'subscription_start_date', current_date,
      'subscription_end_date', v_subscription_end,
      'cycle_start', v_cycle_start,
      'cycle_end', v_cycle_end
    ),
    'تم تفعيل اشتراك Clinic OS من لوحة الإدارة'
  );

  return jsonb_build_object(
    'company_id', p_company_id,
    'plan_code', p_plan_code,
    'subscription_status', 'active',
    'subscription_start_date', current_date,
    'subscription_end_date', v_subscription_end,
    'cycle_start', v_cycle_start,
    'cycle_end', v_cycle_end,
    'limits', jsonb_build_object(
      'whatsapp', v_whatsapp_limit,
      'ai_messages', v_ai_limit,
      'smart_calls', v_call_limit,
      'reminders', v_reminder_limit
    )
  );
end;
$$;

revoke all on function public.admin_activate_clinic_subscription(uuid, text, uuid) from public;
grant execute on function public.admin_activate_clinic_subscription(uuid, text, uuid) to service_role;
