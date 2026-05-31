-- MADAR OS - expose active membership plans to public QR check-in

create or replace function public.get_public_checkin_membership_plans(checkin_token text)
returns table (
  id uuid,
  name text,
  price numeric,
  washes_per_month integer,
  billing_cycle text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.price,
    p.washes_per_month,
    p.billing_cycle
  from public.cw_membership_plans p
  join public.companies c on c.id = p.company_id
  where (c.public_checkin_token = checkin_token or c.webhook_token = checkin_token)
    and p.active = true
    and coalesce((c.cw_automations->'feature_flags'->>'memberships')::boolean, false) = true
    and not (c.status = 'trial' and c.plan_reset_at is not null and c.plan_reset_at < now())
  order by p.price asc, p.created_at asc;
$$;

grant execute on function public.get_public_checkin_membership_plans(text) to anon, authenticated;
