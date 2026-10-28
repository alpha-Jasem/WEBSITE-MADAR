-- Website prospecting: sector, score and website check per lead, plus the package sold to it.
alter table public.outreach_leads
  add column if not exists sector text,
  add column if not exists lead_score int,
  add column if not exists priority_rank int,
  add column if not exists site_status text not null default 'unchecked'
    check (site_status in ('unchecked','needs_verification','verified_none','has_site')),
  add column if not exists package text,
  add column if not exists price numeric;
