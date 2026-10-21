-- Targeting focus: which kinds of businesses count as a lead. Everything else is hidden and never contacted.
-- The match is on the business category Google gives the place (plain words, not regular expressions).

create table if not exists public.lead_focus (
  id int primary key default 1 check (id = 1),
  preset text not null default 'real_estate' check (preset in ('real_estate', 'developers', 'all', 'custom')),
  include_words text[] not null default '{}',
  exclude_words text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.lead_focus (id, preset, include_words, exclude_words) values (
  1, 'real_estate',
  array['real estate', 'property', 'developer', 'development', 'housing', 'apartment', 'realty', 'estate agent', 'rental agency', 'condominium', 'townhouse', 'عقار', 'عقارية', 'مطور', 'تطوير'],
  array['law', 'legal', 'attorney', 'lawyer', 'notary', 'bank', 'government', 'internet cafe', 'cafe', 'restaurant', 'marine', 'salon', 'beauty', 'dental', 'dentist', 'clinic', 'medical', 'hospital', 'تجميل', 'أسنان', 'طبي', 'عيادة', 'محام', 'قانون']
) on conflict (id) do nothing;

alter table public.lead_focus enable row level security;
drop policy if exists lead_focus_admin on public.lead_focus;
create policy lead_focus_admin on public.lead_focus for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.outreach_leads add column if not exists in_focus boolean not null default true;
create index if not exists outreach_leads_focus_idx on public.outreach_leads (in_focus);

create or replace function public.lead_in_focus(p_category text)
returns boolean
language plpgsql stable
as $$
declare f record; w text; c text := lower(coalesce(p_category, ''));
begin
  select * into f from public.lead_focus where id = 1;
  if not found or f.preset = 'all' then return true; end if;
  foreach w in array f.exclude_words loop
    if w <> '' and c like '%' || lower(w) || '%' then return false; end if;
  end loop;
  if coalesce(array_length(f.include_words, 1), 0) = 0 then return true; end if;
  foreach w in array f.include_words loop
    if w <> '' and c like '%' || lower(w) || '%' then return true; end if;
  end loop;
  return false;
end $$;

create or replace function public.trg_lead_focus() returns trigger
language plpgsql as $$
begin
  new.in_focus := public.lead_in_focus(new.category);
  return new;
end $$;
drop trigger if exists lead_focus_set on public.outreach_leads;
create trigger lead_focus_set before insert or update of category on public.outreach_leads
  for each row execute function public.trg_lead_focus();

-- re-evaluates every lead after the focus is edited; returns how many are visible and hidden
create or replace function public.refocus_leads()
returns table (visible bigint, hidden bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.outreach_leads set in_focus = public.lead_in_focus(category) where in_focus is distinct from public.lead_in_focus(category);
  return query select count(*) filter (where in_focus), count(*) filter (where not in_focus) from public.outreach_leads;
end $$;
revoke all on function public.refocus_leads() from public, anon;
grant execute on function public.refocus_leads() to authenticated;

-- apply to the leads already stored
update public.outreach_leads set in_focus = public.lead_in_focus(category);
