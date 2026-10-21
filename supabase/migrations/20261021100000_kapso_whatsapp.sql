-- WhatsApp now runs on Kapso (official WhatsApp Cloud API). The Chrome-extension bridge is gone.

alter table public.wa_settings
  add column if not exists phone_number_id text,
  add column if not exists template_name text not null default 'madar_intro_ar',
  add column if not exists template_lang text not null default 'ar',
  add column if not exists reply_to_new_inbound boolean not null default true;

update public.wa_settings set phone_number_id = coalesce(phone_number_id, '1297531326787680') where id = 1;

-- the extension's per-device tokens are no longer used
drop table if exists public.wa_devices cascade;

-- messages that arrive from people we never contacted (they wrote to the business number first)
alter table public.wa_messages add column if not exists wa_message_id text;
create index if not exists wa_messages_wa_id_idx on public.wa_messages (wa_message_id) where wa_message_id is not null;

-- one scheduled tick per minute sends due first messages and retries queued replies
do $$
declare secret text;
begin
  select value into secret from public.internal_config where key = 'cron_secret';
  if secret is not null then
    if exists (select 1 from cron.job where jobname = 'kapso-tick') then perform cron.unschedule('kapso-tick'); end if;
    perform cron.schedule('kapso-tick', '* * * * *', format(
      $cmd$select net.http_post(url:='https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/kapso-tick', headers:='{"Content-Type":"application/json","x-cron-secret":"%s"}'::jsonb, body:='{}'::jsonb)$cmd$, secret));
  end if;
end $$;
