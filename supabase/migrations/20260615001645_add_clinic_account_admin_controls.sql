create or replace function public.admin_manage_clinic_account(
  p_company_id uuid,
  p_changes jsonb,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company public.companies%rowtype;
  v_plan text;
  v_status text;
  v_start date;
  v_end date;
  v_cycle_start date;
  v_cycle_end date;
  v_reset_usage boolean := coalesce((p_changes->>'reset_usage')::boolean, false);
  v_limits jsonb := coalesce(p_changes->'limits', '{}'::jsonb);
  v_extras jsonb := coalesce(p_changes->'extras', '{}'::jsonb);
begin
  select * into v_company
  from public.companies
  where id = p_company_id
    and (industry = 'clinic' or business_type = 'clinic')
  for update;

  if not found then
    raise exception 'clinic_company_not_found';
  end if;

  v_plan := coalesce(nullif(p_changes->>'plan_code', ''), v_company.clinic_plan_code, 'whatsapp');
  v_status := coalesce(nullif(p_changes->>'subscription_status', ''), v_company.subscription_status, 'inactive');
  v_start := coalesce(nullif(p_changes->>'subscription_start_date', '')::date, v_company.subscription_start_date);
  v_end := coalesce(nullif(p_changes->>'subscription_end_date', '')::date, v_company.subscription_end_date);
  v_cycle_start := coalesce(nullif(p_changes->>'cycle_start', '')::date, v_company.monthly_usage_cycle_start, current_date);
  v_cycle_end := coalesce(nullif(p_changes->>'cycle_end', '')::date, v_company.monthly_usage_cycle_end, (v_cycle_start + interval '1 month - 1 day')::date);

  if v_plan not in ('whatsapp', 'ai_pro') then
    raise exception 'invalid_clinic_plan';
  end if;
  if v_status not in ('active', 'trial', 'inactive', 'expired', 'suspended', 'warning', 'usage_limited') then
    raise exception 'invalid_subscription_status';
  end if;
  if v_start is not null and v_end is not null and v_end < v_start then
    raise exception 'invalid_subscription_dates';
  end if;
  if v_cycle_end < v_cycle_start then
    raise exception 'invalid_cycle_dates';
  end if;

  update public.companies
  set clinic_plan_code = v_plan,
      package_type = v_plan,
      plan = case when v_plan = 'ai_pro' then 'enterprise' else 'growth' end,
      subscription_status = v_status,
      status = case
        when v_status = 'trial' then 'trial'
        when v_status in ('suspended', 'expired', 'inactive') then 'suspended'
        else 'active'
      end,
      subscription_start_date = v_start,
      subscription_end_date = v_end,
      monthly_usage_cycle_start = v_cycle_start,
      monthly_usage_cycle_end = v_cycle_end,
      manual_override_status = v_status,
      payment_provider = coalesce(nullif(p_changes->>'payment_provider', ''), payment_provider, 'manual'),
      last_payment_status = coalesce(nullif(p_changes->>'payment_status', ''), last_payment_status),
      last_payment_at = case
        when p_changes ? 'payment_status' and p_changes->>'payment_status' = 'paid' then now()
        else last_payment_at
      end,
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
    greatest(0, coalesce((v_limits->>'whatsapp')::integer, case when v_plan = 'ai_pro' then 2500 else 1500 end)),
    greatest(0, coalesce((v_limits->>'ai_messages')::integer, case when v_plan = 'ai_pro' then 5000 else 3000 end)),
    greatest(0, coalesce((v_limits->>'smart_calls')::integer, case when v_plan = 'ai_pro' then 300 else 0 end)),
    greatest(0, coalesce((v_limits->>'reminders')::integer, case when v_plan = 'ai_pro' then 700 else 500 end)),
    greatest(0, coalesce((v_extras->>'whatsapp')::integer, 0)),
    greatest(0, coalesce((v_extras->>'ai_messages')::integer, 0)),
    greatest(0, coalesce((v_extras->>'smart_calls')::integer, 0)),
    greatest(0, coalesce((v_extras->>'reminders')::integer, 0)),
    nullif(p_changes->>'extra_limits_expire_at', '')::timestamptz,
    p_actor_id,
    now()
  )
  on conflict (company_id) do update set
    whatsapp_conversations_limit = excluded.whatsapp_conversations_limit,
    ai_messages_limit = excluded.ai_messages_limit,
    smart_call_minutes_limit = excluded.smart_call_minutes_limit,
    appointment_reminders_limit = excluded.appointment_reminders_limit,
    extra_whatsapp_conversations = excluded.extra_whatsapp_conversations,
    extra_ai_messages = excluded.extra_ai_messages,
    extra_smart_call_minutes = excluded.extra_smart_call_minutes,
    extra_appointment_reminders = excluded.extra_appointment_reminders,
    extra_limits_expire_at = excluded.extra_limits_expire_at,
    updated_by_admin_id = p_actor_id,
    updated_at = now();

  insert into public.clinic_os_usage (company_id, cycle_start, cycle_end, updated_at)
  values (p_company_id, v_cycle_start, v_cycle_end, now())
  on conflict (company_id, cycle_start) do update set
    cycle_end = excluded.cycle_end,
    whatsapp_conversations_used = case when v_reset_usage then 0 else clinic_os_usage.whatsapp_conversations_used end,
    ai_messages_used = case when v_reset_usage then 0 else clinic_os_usage.ai_messages_used end,
    smart_call_minutes_used = case when v_reset_usage then 0 else clinic_os_usage.smart_call_minutes_used end,
    appointment_reminders_used = case when v_reset_usage then 0 else clinic_os_usage.appointment_reminders_used end,
    bookings_created = case when v_reset_usage then 0 else clinic_os_usage.bookings_created end,
    human_handoffs = case when v_reset_usage then 0 else clinic_os_usage.human_handoffs end,
    after_hours_conversations = case when v_reset_usage then 0 else clinic_os_usage.after_hours_conversations end,
    missed_call_recoveries = case when v_reset_usage then 0 else clinic_os_usage.missed_call_recoveries end,
    lost_opportunities = case when v_reset_usage then 0 else clinic_os_usage.lost_opportunities end,
    updated_at = now();

  insert into public.clinic_os_audit_logs (
    company_id, actor_type, actor_id, action, old_value, new_value, note
  ) values (
    p_company_id,
    'admin',
    p_actor_id,
    case when v_reset_usage then 'account_updated_and_usage_reset' else 'account_updated' end,
    jsonb_build_object(
      'plan', v_company.clinic_plan_code,
      'subscription_status', v_company.subscription_status,
      'subscription_start_date', v_company.subscription_start_date,
      'subscription_end_date', v_company.subscription_end_date
    ),
    p_changes,
    coalesce(nullif(p_changes->>'note', ''), 'Clinic OS account updated from admin dashboard')
  );

  return jsonb_build_object(
    'company_id', p_company_id,
    'plan_code', v_plan,
    'subscription_status', v_status,
    'subscription_start_date', v_start,
    'subscription_end_date', v_end,
    'cycle_start', v_cycle_start,
    'cycle_end', v_cycle_end,
    'usage_reset', v_reset_usage
  );
end;
$$;

revoke all on function public.admin_manage_clinic_account(uuid, jsonb, uuid) from public;
revoke all on function public.admin_manage_clinic_account(uuid, jsonb, uuid) from anon;
revoke all on function public.admin_manage_clinic_account(uuid, jsonb, uuid) from authenticated;
grant execute on function public.admin_manage_clinic_account(uuid, jsonb, uuid) to service_role;
