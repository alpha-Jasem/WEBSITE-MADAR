-- The company's WhatsApp number now lives as an inbox on the voice platform. Keep its id and number
-- next to the Meta token, so status, replies and follow-ups know which inbox and sender to use.
-- Additive only: nullable columns on an existing service-role-only table.
alter table public.whatsapp_cloud_accounts add column if not exists nabrah_inbox_id text unique;
alter table public.whatsapp_cloud_accounts add column if not exists phone_number_id text;
alter table public.whatsapp_cloud_accounts add column if not exists phone_number text;
alter table public.whatsapp_cloud_accounts add column if not exists inbox_name text;
