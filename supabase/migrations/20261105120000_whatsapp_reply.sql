-- Free-text replies from the dashboard inbox, sent from the company's own WhatsApp number.
-- The voice platform owns the number's webhook (the agent keeps answering); replies go
-- straight to Meta's Cloud API with a token from the company's Meta Business (system user).
-- The token is service-role only: no client policies.

create table if not exists public.whatsapp_cloud_accounts (
  company_id   uuid primary key references public.companies(id) on delete cascade,
  access_token text not null,
  updated_at   timestamptz not null default now()
);

comment on table public.whatsapp_cloud_accounts is
  'Meta Cloud API token per company for dashboard WhatsApp replies. Service role only.';

alter table public.whatsapp_cloud_accounts enable row level security;
revoke all on public.whatsapp_cloud_accounts from anon, authenticated;
