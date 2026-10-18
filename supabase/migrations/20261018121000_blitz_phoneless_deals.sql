-- Sales Blitz rows without a usable phone cannot become outreach leads (phone is required and unique).
-- Keep the ones that already progressed as deals so the history is not lost.
insert into public.deals (company_name, contact_name, stage, campaign, source, legacy_ref, created_at)
select s.clinic, s.contact,
  case s.status when 'meeting_booked' then 'qualified' when 'won' then 'won' when 'lost' then 'lost' else 'contacted' end,
  s.campaign, 'sales_blitz', 'blitz_deal_nophone:' || s.id, s.created_at
from public.sales_blitz_leads s
where public.normalize_sa_phone(s.phone) is null and s.status <> 'pending'
on conflict do nothing;
