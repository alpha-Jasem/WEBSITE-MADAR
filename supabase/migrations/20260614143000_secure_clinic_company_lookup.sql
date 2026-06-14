create or replace function public.get_my_clinic_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id
  from public.companies
  where auth_user_id = auth.uid()
  limit 1;
$$;
