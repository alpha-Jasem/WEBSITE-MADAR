-- 1) Remove the legacy car-wash jobs. They failed on every run since the product was removed.
--    To bring one back: select cron.schedule('cw-daily-reactivation', '0 7 * * *', 'select public.cw_job_daily_reactivation()');
--    (cw-post-followup: '0 * * * *' -> public.cw_job_post_followup(); cw-review-request: '*/30 * * * *' -> public.cw_job_review_request()).
do $$
declare j text;
begin
  foreach j in array array['cw-daily-reactivation', 'cw-post-followup', 'cw-review-request'] loop
    if exists (select 1 from cron.job where jobname = j) then perform cron.unschedule(j); end if;
  end loop;
end $$;

-- 2) Server-side config that triggers need (never readable from the browser: RLS on, no policies).
create table if not exists public.internal_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.internal_config enable row level security;
revoke all on public.internal_config from anon, authenticated;

-- reuse the secret the scheduled jobs already send to the edge functions
insert into public.internal_config (key, value)
select 'cron_secret', substring(command from 'x-cron-secret"\s*:\s*"([^"]+)')
from cron.job where jobname = 'outreach-tick' and command ~ 'x-cron-secret'
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 3) Push the owner's phone on business events. Never blocks the write it is attached to.
create or replace function public.notify_admin(p_title text, p_body text, p_url text default '/admin', p_tag text default 'event')
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare secret text;
begin
  select value into secret from public.internal_config where key = 'cron_secret';
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/outreach-daily',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('action', 'notify', 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag)
  );
exception when others then
  null;
end $$;
revoke all on function public.notify_admin(text, text, text, text) from public, anon, authenticated;

create or replace function public.trg_notify_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending_verification' then
    perform public.notify_admin('دفعة جديدة بانتظار التحقق', coalesce(nullif(new.customer_name, ''), 'عميل') || ': ' || to_char(new.total_amount, 'FM999G999G990') || ' ر.س. راجعها وأكّدها من المالية.', '/admin/finance', 'payment');
  elsif new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    perform public.notify_admin('تحصّلت دفعة', coalesce(nullif(new.customer_name, ''), 'عميل') || ': ' || to_char(new.total_amount, 'FM999G999G990') || ' ر.س. أُضيفت للتحصيل.', '/admin/finance', 'payment');
  end if;
  return new;
end $$;
drop trigger if exists notify_payment on public.payments;
create trigger notify_payment after insert or update of status on public.payments
  for each row execute function public.trg_notify_payment();

create or replace function public.trg_notify_deal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage and new.stage in ('awaiting_payment', 'won', 'lost') then
    perform public.notify_admin(
      case new.stage when 'won' then 'صفقة مغلقة بنجاح' when 'awaiting_payment' then 'صفقة بانتظار الدفع' else 'صفقة خُسرت' end,
      new.company_name || case new.stage when 'lost' then coalesce(': ' || nullif(new.lost_reason, ''), '') else '' end,
      '/admin/pipeline', 'deal');
  end if;
  return new;
end $$;
drop trigger if exists notify_deal on public.deals;
create trigger notify_deal after update of stage on public.deals
  for each row execute function public.trg_notify_deal();

create or replace function public.trg_notify_bank() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admin('إشعار تحويل جديد', 'مبلغ ' || coalesce(to_char(new.amount, 'FM999G999G990'), 'غير واضح') || ' ر.س' || coalesce(' · مرجع ' || nullif(new.reference, ''), '') || '. بانتظار مطابقتك مع دفعة.', '/admin/bank', 'bank');
  return new;
end $$;
drop trigger if exists notify_bank on public.bank_notifications;
create trigger notify_bank after insert on public.bank_notifications
  for each row execute function public.trg_notify_bank();

-- 4) Remember which follow-up / meeting time was already pushed, so each reminder fires once.
alter table public.outreach_leads
  add column if not exists followup_pushed_for timestamptz,
  add column if not exists meeting_pushed_for timestamptz;
