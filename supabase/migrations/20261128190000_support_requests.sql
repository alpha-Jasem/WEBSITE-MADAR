-- Support requests (مركز المساعدة ← إرسال طلب): a customer writes to the Madar team from the dashboard.
-- Each request also lands in the admin notifications list so the team sees it. Additive only.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid default auth.uid(),
  email text,
  kind text not null default 'unsure',
  subject text not null check (char_length(subject) between 1 and 200),
  details text not null check (char_length(details) between 1 and 5000),
  reference text,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists support_requests_company_idx on public.support_requests (company_id, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists support_requests_own_company_select on public.support_requests;
create policy support_requests_own_company_select on public.support_requests
  for select to authenticated using (company_id = public.get_my_clinic_company_id());

drop policy if exists support_requests_own_company_insert on public.support_requests;
create policy support_requests_own_company_insert on public.support_requests
  for insert to authenticated with check (company_id = public.get_my_clinic_company_id());

drop policy if exists support_requests_admin_all on public.support_requests;
create policy support_requests_admin_all on public.support_requests
  for all to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists support_requests_service_all on public.support_requests;
create policy support_requests_service_all on public.support_requests
  for all to service_role using (true) with check (true);

create or replace function public.notify_support_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.clinic_os_admin_notifications (company_id, notification_type, title, message, severity)
  values (new.company_id, 'support_request', 'طلب دعم جديد: ' || left(new.subject, 80), left(new.details, 400), 'info');
  return new;
end $$;

drop trigger if exists support_requests_notify on public.support_requests;
create trigger support_requests_notify after insert on public.support_requests
  for each row execute function public.notify_support_request();
