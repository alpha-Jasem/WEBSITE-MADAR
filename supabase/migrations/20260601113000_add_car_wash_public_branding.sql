alter table public.companies
  add column if not exists logo_url text;

drop function if exists public.get_public_checkin_company(text);

create function public.get_public_checkin_company(checkin_token text)
returns table (
  id uuid,
  name text,
  logo_url text,
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
    c.logo_url,
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
