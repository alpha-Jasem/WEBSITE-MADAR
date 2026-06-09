-- MADAR OS - self check-in WhatsApp OTP

create extension if not exists "pgcrypto";

create table if not exists public.cw_phone_otps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  verification_token text,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cw_phone_otps_lookup_idx
  on public.cw_phone_otps(company_id, phone, created_at desc);

create index if not exists cw_phone_otps_verification_idx
  on public.cw_phone_otps(company_id, phone, verification_token)
  where verification_token is not null;

alter table public.cw_phone_otps enable row level security;

drop policy if exists "cw_phone_otps_service_only" on public.cw_phone_otps;
create policy "cw_phone_otps_service_only"
  on public.cw_phone_otps
  for all
  using (false)
  with check (false);
