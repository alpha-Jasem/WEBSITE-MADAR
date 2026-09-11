-- The signup trigger only provisioned clinics: any other business_type returned
-- early, leaving the new user with no `users` row and no `companies` row, so the
-- dashboard loaded straight into an account error. It also force-wrote
-- industry/business_type to 'clinic' on both paths, silently discarding whatever
-- the customer picked at signup.
--
-- The dashboard is vertical-agnostic now, so provisioning is too. Function and
-- trigger names are unchanged so nothing else has to move.

create or replace function public.create_clinic_trial_from_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_company_id uuid;
  v_plan text;
  v_type text;
  v_name text;
begin
  v_type := nullif(coalesce(v_meta->>'account_type', v_meta->>'business_type', ''), '');

  -- Signups that carry no business type at all are not self-serve tenants
  -- (admin-created staff, invites, service accounts) and are left untouched.
  if v_type is null then
    return new;
  end if;

  if v_type not in ('clinic', 'real_estate', 'other') then
    v_type := 'other';
  end if;

  v_plan := case when v_meta->>'package_type' = 'ai_pro' then 'ai_pro' else 'whatsapp' end;

  -- 'clinic_name' is the legacy metadata key; 'company_name' is what new signups send.
  v_name := coalesce(
    nullif(v_meta->>'company_name', ''),
    nullif(v_meta->>'clinic_name', ''),
    'حساب جديد'
  );

  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(nullif(v_meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'مستخدم جديد'),
    'client'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = case when public.users.role = 'admin' then public.users.role else 'client' end;

  select id into v_company_id
  from public.companies
  where auth_user_id = new.id
     or lower(owner_email) = lower(coalesce(new.email, ''))
  limit 1;

  if v_company_id is null then
    insert into public.companies (
      name, owner_name, owner_email, owner_phone, industry, business_type,
      plan, status, package_type, clinic_plan_code, subscription_status,
      auth_user_id, trial_ends_at, plan_reset_at,
      subscription_start_date, subscription_end_date,
      monthly_usage_cycle_start, monthly_usage_cycle_end,
      monthly_messages, monthly_leads, automations_count, message_limit, messages_used,
      tax_enabled, vat_rate, price_includes_vat
    ) values (
      v_name,
      coalesce(nullif(v_meta->>'full_name', ''), 'مالك الحساب'),
      lower(coalesce(new.email, '')),
      coalesce(v_meta->>'owner_phone', ''),
      v_type, v_type,
      'starter', 'trial', v_plan, v_plan, 'trial',
      new.id, now() + interval '3 days', now() + interval '3 days',
      current_date, current_date + 3,
      current_date, current_date + 3,
      0, 0, 0, 500, 0, true, 15, true
    ) returning id into v_company_id;
  else
    -- A row already here means an operator pre-created the account; their
    -- classification is deliberate and outranks the signup metadata.
    update public.companies
    set auth_user_id  = coalesce(auth_user_id, new.id),
        industry      = coalesce(nullif(industry, ''), v_type),
        business_type = coalesce(nullif(business_type, ''), v_type),
        updated_at    = now()
    where id = v_company_id;
  end if;

  return new;
end;
$$;

drop trigger if exists create_clinic_trial_after_auth_signup on auth.users;
create trigger create_clinic_trial_after_auth_signup
after insert on auth.users
for each row execute function public.create_clinic_trial_from_auth_signup();

revoke all on function public.create_clinic_trial_from_auth_signup() from public;
revoke all on function public.create_clinic_trial_from_auth_signup() from anon;
revoke all on function public.create_clinic_trial_from_auth_signup() from authenticated;
