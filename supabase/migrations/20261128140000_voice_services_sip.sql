-- Inbound/outbound services can now be real SIP trunks on the voice platform. Each row keeps the platform's id and the
-- non-secret connection details (the SIP password is sent to the platform once and never stored here). Additive only.
alter table public.voice_services add column if not exists nabrah_id text;
alter table public.voice_services add column if not exists transport text not null default 'udp' check (transport in ('udp', 'tcp', 'tls'));
alter table public.voice_services add column if not exists address text;
alter table public.voice_services add column if not exists max_channels integer check (max_channels is null or (max_channels between 1 and 500));
alter table public.voice_services add column if not exists allowed_ips text[] not null default '{}';
alter table public.voice_services add column if not exists sip_username text;
alter table public.voice_services add column if not exists agent_ids text[] not null default '{}';
