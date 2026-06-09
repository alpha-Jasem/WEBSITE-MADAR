-- Count operational WhatsApp usage against the company package.
-- This covers delivery receipts/review follow-ups and manual campaigns.

create or replace function public.cw_increment_message_usage(p_company_id uuid, p_count integer default 1)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_company_id is null or coalesce(p_count, 0) <= 0 then
    return;
  end if;

  update public.companies
     set messages_used = coalesce(messages_used, 0) + p_count
   where id = p_company_id;
end;
$function$;

create or replace function public.cw_send_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_campaign public.cw_campaigns%rowtype;
  v_phone text;
  v_clean_phone text;
  v_sent_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_campaign
    from public.cw_campaigns
   where id = p_campaign_id
   for update;

  if not found then
    raise exception 'campaign_not_found';
  end if;

  if coalesce(trim(v_campaign.message), '') = '' then
    update public.cw_campaigns
       set status = 'failed'
     where id = p_campaign_id;

    return jsonb_build_object('ok', false, 'error', 'empty_message', 'sent_count', 0);
  end if;

  if coalesce(array_length(v_campaign.phones, 1), 0) = 0 then
    update public.cw_campaigns
       set status = 'failed'
     where id = p_campaign_id;

    return jsonb_build_object('ok', false, 'error', 'no_recipients', 'sent_count', 0);
  end if;

  update public.cw_campaigns
     set status = 'sending'
   where id = p_campaign_id;

  foreach v_phone in array v_campaign.phones loop
    v_clean_phone := regexp_replace(coalesce(v_phone, ''), '\D', '', 'g');

    if v_clean_phone <> '' then
      perform public.cw_send_whatsapp(v_clean_phone, v_campaign.message);
      v_sent_count := v_sent_count + 1;
    end if;
  end loop;

  perform public.cw_increment_message_usage(v_campaign.company_id, v_sent_count);

  update public.cw_campaigns
     set status = 'queued',
         sent_count = v_sent_count,
         sent_at = now()
   where id = p_campaign_id;

  return jsonb_build_object('ok', true, 'status', 'queued', 'sent_count', v_sent_count);
end;
$function$;

revoke all on function public.cw_send_campaign(uuid) from public;
grant execute on function public.cw_send_campaign(uuid) to authenticated;

create or replace function public.cw_trigger_delivery_receipt()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_co record;
  v_tmpl text;
  v_pay text;
  v_review_block text := '';
begin
  if NEW.status <> 'delivered' or OLD.status = 'delivered' then return NEW; end if;
  if NEW.phone is null then return NEW; end if;

  select name, cw_message_templates, cw_automations, google_maps_url into v_co
  from public.companies where id = NEW.company_id;

  if not cw_automation_enabled(v_co.cw_automations, 'delivery_receipt') then return NEW; end if;

  v_pay := case NEW.payment_method
    when 'cash'          then 'نقد'
    when 'mada'          then 'مدى'
    when 'visa'          then 'فيزا'
    when 'bank_transfer' then 'تحويل بنكي'
    when 'stc_pay'       then 'STC Pay'
    else coalesce(NEW.payment_method, 'غير محدد')
  end;

  if v_co.google_maps_url is not null and trim(v_co.google_maps_url) <> '' then
    v_review_block :=
      chr(10) || chr(10) ||
      'إذا عندك أي ملاحظة، رد على هذه الرسالة ويسعدنا خدمتك.' || chr(10) ||
      'وإذا كانت تجربتك ممتازة، يسعدنا تقييمك هنا:' || chr(10) ||
      '{{maps_url}}';
  else
    v_review_block :=
      chr(10) || chr(10) ||
      'إذا عندك أي ملاحظة، رد على هذه الرسالة ويسعدنا خدمتك.';
  end if;

  if coalesce(NEW.is_free_wash, false) then
    v_tmpl := coalesce(v_co.cw_message_templates->>'delivery_receipt_free',
      'شكراً {{customer_name}} على زيارتك لـ {{company_name}}' || chr(10) ||
      'هذه الزيارة مجانية كمكافأة ولائك. نتطلع لرؤيتك مجدداً.' || v_review_block);
  else
    v_tmpl := coalesce(v_co.cw_message_templates->>'delivery_receipt',
      'شكراً {{customer_name}} على زيارتك لـ {{company_name}}' || chr(10) || chr(10) ||
      'الخدمة: {{service}}' || chr(10) ||
      'المبلغ: {{total}} ر.س' || chr(10) ||
      'طريقة الدفع: {{payment_method}}' || chr(10) || chr(10) ||
      'نتطلع لرؤيتك مجدداً.' || v_review_block);
  end if;

  perform cw_send_whatsapp(NEW.phone, cw_format_template(v_tmpl, jsonb_build_object(
    'customer_name',  coalesce(NEW.customer_name, 'عزيزي العميل'),
    'company_name',   coalesce(v_co.name, ''),
    'service',        coalesce(NEW.service_name, ''),
    'total',          coalesce(round(coalesce(NEW.total_amount, NEW.price, 0))::text, '0'),
    'payment_method', v_pay,
    'maps_url',       coalesce(v_co.google_maps_url, '')
  )));

  perform public.cw_increment_message_usage(NEW.company_id, 1);

  update public.cw_visits
     set review_request_sent = true,
         review_request_sent_at = coalesce(review_request_sent_at, now()),
         followup_sent = true
   where company_id = NEW.company_id
     and phone = NEW.phone
     and created_at > now() - interval '6 hours';

  return NEW;
end;
$function$;
