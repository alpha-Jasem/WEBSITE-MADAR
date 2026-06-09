-- Allow car wash visits to be recorded even when a walk-in customer record is missing.
alter table public.cw_visits
  alter column customer_id drop not null;
