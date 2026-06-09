-- Delivery receipt trigger and queue delivery flow need these fields on visits.
alter table public.cw_visits
  add column if not exists phone text,
  add column if not exists customer_name text,
  add column if not exists followup_sent boolean not null default false;

create index if not exists cw_visits_company_phone_created_idx
  on public.cw_visits(company_id, phone, created_at desc);
