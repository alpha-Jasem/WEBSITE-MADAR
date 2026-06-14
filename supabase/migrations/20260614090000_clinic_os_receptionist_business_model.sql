alter table public.companies
  add column if not exists clinic_plan_code text default 'whatsapp',
  add column if not exists subscription_status text default 'active',
  add column if not exists subscription_start_date date,
  add column if not exists subscription_end_date date,
  add column if not exists monthly_usage_cycle_start date,
  add column if not exists monthly_usage_cycle_end date,
  add column if not exists manual_override_status text,
  add column if not exists payment_provider text,
  add column if not exists external_subscription_id text,
  add column if not exists last_payment_status text,
  add column if not exists last_payment_at timestamptz;

create table if not exists public.clinic_os_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  annual_price numeric(12,2) not null,
  setup_fee numeric(12,2) not null,
  included_whatsapp_conversations integer not null default 0,
  included_ai_messages integer not null default 0,
  included_smart_call_minutes integer not null default 0,
  included_appointment_reminders integer not null default 0,
  support_level text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.clinic_os_plans (code,name,annual_price,setup_fee,included_whatsapp_conversations,included_ai_messages,included_smart_call_minutes,included_appointment_reminders,support_level)
values
  ('whatsapp','WhatsApp AI Receptionist',15000,4000,1500,3000,0,500,'basic'),
  ('ai_pro','AI Receptionist + Smart Calls',27000,5000,2500,5000,300,700,'priority')
on conflict (code) do update set
  name=excluded.name, annual_price=excluded.annual_price, setup_fee=excluded.setup_fee,
  included_whatsapp_conversations=excluded.included_whatsapp_conversations,
  included_ai_messages=excluded.included_ai_messages,
  included_smart_call_minutes=excluded.included_smart_call_minutes,
  included_appointment_reminders=excluded.included_appointment_reminders,
  support_level=excluded.support_level, updated_at=now();

create table if not exists public.clinic_os_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  whatsapp_conversations_used integer not null default 0,
  ai_messages_used integer not null default 0,
  smart_call_minutes_used integer not null default 0,
  appointment_reminders_used integer not null default 0,
  bookings_created integer not null default 0,
  human_handoffs integer not null default 0,
  after_hours_conversations integer not null default 0,
  missed_call_recoveries integer not null default 0,
  lost_opportunities integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,cycle_start)
);

create table if not exists public.clinic_os_usage_limits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  whatsapp_conversations_limit integer not null default 1500,
  ai_messages_limit integer not null default 3000,
  smart_call_minutes_limit integer not null default 0,
  appointment_reminders_limit integer not null default 500,
  extra_whatsapp_conversations integer not null default 0,
  extra_ai_messages integer not null default 0,
  extra_smart_call_minutes integer not null default 0,
  extra_appointment_reminders integer not null default 0,
  extra_limits_expire_at timestamptz,
  updated_by_admin_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_os_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  severity text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_os_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_os_lost_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_name text,
  customer_phone text not null,
  opportunity_type text not null,
  interested_service text,
  priority text not null default 'medium',
  last_contact_at timestamptz,
  status text not null default 'open',
  suggested_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_os_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  title text not null,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clinic_os_plans enable row level security;
alter table public.clinic_os_usage enable row level security;
alter table public.clinic_os_usage_limits enable row level security;
alter table public.clinic_os_admin_notifications enable row level security;
alter table public.clinic_os_audit_logs enable row level security;
alter table public.clinic_os_lost_opportunities enable row level security;
alter table public.clinic_os_knowledge_items enable row level security;

drop policy if exists "clinic plans readable" on public.clinic_os_plans;
create policy "clinic plans readable" on public.clinic_os_plans for select to authenticated using (is_active);

do $$
declare t text;
begin
  foreach t in array array['clinic_os_usage','clinic_os_usage_limits','clinic_os_lost_opportunities','clinic_os_knowledge_items'] loop
    execute format('drop policy if exists "clinic own company" on public.%I', t);
    execute format('create policy "clinic own company" on public.%I for all to authenticated using (company_id = public.get_my_clinic_company_id()) with check (company_id = public.get_my_clinic_company_id())', t);
  end loop;
end $$;

drop policy if exists "admin notifications admin only" on public.clinic_os_admin_notifications;
create policy "admin notifications admin only" on public.clinic_os_admin_notifications for all to authenticated
using (exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin'))
with check (exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin'));

drop policy if exists "audit logs admin or owner" on public.clinic_os_audit_logs;
create policy "audit logs admin or owner" on public.clinic_os_audit_logs for select to authenticated
using (company_id=public.get_my_clinic_company_id() or exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin'));

create or replace function public.clinic_os_ai_actions_allowed(p_company_id uuid)
returns boolean language sql stable security invoker set search_path=public as $$
  select coalesce((select subscription_status='active' from public.companies where id=p_company_id),false);
$$;

create or replace function public.clinic_os_recalculate_usage_status(p_company_id uuid)
returns text language plpgsql security invoker set search_path=public as $$
declare u public.clinic_os_usage%rowtype; l public.clinic_os_usage_limits%rowtype; highest numeric; next_status text;
begin
  select * into u from public.clinic_os_usage where company_id=p_company_id order by cycle_start desc limit 1;
  select * into l from public.clinic_os_usage_limits where company_id=p_company_id;
  if u.id is null or l.id is null then return 'active'; end if;
  highest := greatest(
    u.whatsapp_conversations_used::numeric/nullif(l.whatsapp_conversations_limit+l.extra_whatsapp_conversations,0),
    u.ai_messages_used::numeric/nullif(l.ai_messages_limit+l.extra_ai_messages,0),
    coalesce(u.smart_call_minutes_used::numeric/nullif(l.smart_call_minutes_limit+l.extra_smart_call_minutes,0),0),
    u.appointment_reminders_used::numeric/nullif(l.appointment_reminders_limit+l.extra_appointment_reminders,0)
  );
  next_status := case when highest>=1 then 'usage_limited' when highest>=.8 then 'warning' else 'active' end;
  update public.companies set subscription_status=next_status,updated_at=now() where id=p_company_id and subscription_status not in ('expired','suspended');
  return next_status;
end $$;

create or replace function public.clinic_os_monthly_reset()
returns integer language plpgsql security invoker set search_path=public as $$
declare c record; reset_count integer:=0;
begin
  for c in select * from public.companies where business_type='clinic' and monthly_usage_cycle_end < current_date loop
    insert into public.clinic_os_usage(company_id,cycle_start,cycle_end) values(c.id,current_date,current_date+interval '1 month'-interval '1 day') on conflict do nothing;
    update public.clinic_os_usage_limits set extra_whatsapp_conversations=0,extra_ai_messages=0,extra_smart_call_minutes=0,extra_appointment_reminders=0,extra_limits_expire_at=null,updated_at=now() where company_id=c.id;
    update public.companies set monthly_usage_cycle_start=current_date,monthly_usage_cycle_end=current_date+interval '1 month'-interval '1 day',subscription_status=case when subscription_end_date<current_date then 'expired' when subscription_status='suspended' then 'suspended' else 'active' end,updated_at=now() where id=c.id;
    insert into public.clinic_os_audit_logs(company_id,actor_type,action,note) values(c.id,'system','usage_reset','Monthly Clinic OS usage reset');
    reset_count:=reset_count+1;
  end loop;
  return reset_count;
end $$;

create index if not exists clinic_os_usage_company_cycle_idx on public.clinic_os_usage(company_id,cycle_start desc);
create index if not exists clinic_os_lost_opportunities_company_status_idx on public.clinic_os_lost_opportunities(company_id,status);
create index if not exists clinic_os_knowledge_items_company_type_idx on public.clinic_os_knowledge_items(company_id,type);
