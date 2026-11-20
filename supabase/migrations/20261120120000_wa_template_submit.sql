-- Submit WhatsApp templates to Meta from the dashboard and show their approval status.
-- Additive only: status columns on whatsapp_templates, and the WhatsApp Business Account id next to the token
-- (Meta creates templates under the business account, not under the phone number).

alter table public.whatsapp_templates add column if not exists meta_status text;
alter table public.whatsapp_templates add column if not exists meta_template_id text;
alter table public.whatsapp_templates add column if not exists meta_error text;
alter table public.whatsapp_templates add column if not exists meta_synced_at timestamptz;

alter table public.whatsapp_cloud_accounts add column if not exists waba_id text;
