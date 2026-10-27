-- Each fetch keeps its own sector (from the search it came from). The focus words were written for real estate,
-- so they only hide leads from real estate searches; a restaurants fetch keeps every restaurant.

create or replace function public.query_is_real_estate(q text)
returns boolean language sql immutable as $$
  select coalesce(q, '') ~* '(real estate|property|developer|development|realty|apartment|housing|عقار|تطوير)'
$$;

create or replace function public.lead_visible(p_run_id uuid, p_category text)
returns boolean language plpgsql stable as $$
declare q text;
begin
  if p_run_id is not null then select query into q from public.outreach_runs where id = p_run_id; end if;
  if q is not null and not public.query_is_real_estate(q) then return true; end if;
  return public.lead_in_focus(p_category);
end $$;

create or replace function public.trg_lead_focus() returns trigger
language plpgsql as $$
begin
  new.in_focus := public.lead_visible(new.run_id, new.category);
  return new;
end $$;

create or replace function public.refocus_leads()
returns table (visible bigint, hidden bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.outreach_leads set in_focus = public.lead_visible(run_id, category)
    where in_focus is distinct from public.lead_visible(run_id, category);
  return query select count(*) filter (where in_focus), count(*) filter (where not in_focus) from public.outreach_leads;
end $$;
revoke all on function public.refocus_leads() from public, anon;
grant execute on function public.refocus_leads() to authenticated;

update public.outreach_leads set in_focus = public.lead_visible(run_id, category)
  where in_focus is distinct from public.lead_visible(run_id, category);
