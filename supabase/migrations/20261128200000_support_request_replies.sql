-- The Madar team's reply on a support request, shown to the customer under «طلباتي». Additive only.
alter table public.support_requests add column if not exists admin_reply text;
alter table public.support_requests add column if not exists replied_at timestamptz;
