-- MADAR OS - public self check-in hardening

create extension if not exists "pgcrypto";

alter table public.companies
  add column if not exists public_checkin_token text,
  add column if not exists cw_automations jsonb not null default '{}'::jsonb;

update public.companies
set public_checkin_token = coalesce(public_checkin_token, encode(gen_random_bytes(18), 'hex'))
where public_checkin_token is null;

create unique index if not exists companies_public_checkin_token_key
  on public.companies(public_checkin_token)
  where public_checkin_token is not null;

create index if not exists companies_webhook_token_idx
  on public.companies(webhook_token)
  where webhook_token is not null;

create index if not exists cw_queue_company_created_idx
  on public.cw_queue(company_id, created_at);

create index if not exists cw_queue_company_phone_created_idx
  on public.cw_queue(company_id, phone, created_at);

create or replace function public.rotate_company_checkin_token(target_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_token text;
begin
  if public.get_my_role() <> 'admin' and public.get_my_company() <> target_company_id then
    raise exception 'not allowed';
  end if;

  next_token := encode(gen_random_bytes(18), 'hex');

  update public.companies
  set public_checkin_token = next_token
  where id = target_company_id;

  return next_token;
end;
$$;

drop function if exists public.get_public_checkin_company(text);

create function public.get_public_checkin_company(checkin_token text)
returns table (
  id uuid,
  name text,
  business_type text,
  industry text,
  status text,
  plan text,
  plan_reset_at timestamptz,
  public_checkin_token text,
  webhook_token text,
  tax_enabled boolean,
  vat_rate numeric,
  price_includes_vat boolean,
  cw_loyalty_threshold integer,
  cw_automations jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.business_type,
    c.industry,
    c.status,
    c.plan,
    c.plan_reset_at,
    c.public_checkin_token,
    c.webhook_token,
    c.tax_enabled,
    c.vat_rate,
    c.price_includes_vat,
    c.cw_loyalty_threshold,
    c.cw_automations
  from public.companies c
  where (c.public_checkin_token = checkin_token or c.webhook_token = checkin_token)
    and not (c.status = 'trial' and c.plan_reset_at is not null and c.plan_reset_at < now())
  limit 1;
$$;

grant execute on function public.get_public_checkin_company(text) to anon, authenticated;
