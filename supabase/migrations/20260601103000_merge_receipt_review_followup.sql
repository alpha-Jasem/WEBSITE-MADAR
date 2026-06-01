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
      'شكراً {{customer_name}} على زيارتك لـ {{company_name}} 🙏✨' || chr(10) ||
      'هذه الزيارة مجانية كمكافأة ولائك! نتطلع لرؤيتك مجدداً.' || v_review_block);
  else
    v_tmpl := coalesce(v_co.cw_message_templates->>'delivery_receipt',
      'شكراً {{customer_name}} على زيارتك لـ {{company_name}} 🙏' || chr(10) || chr(10) ||
      '✅ الخدمة: {{service}}' || chr(10) ||
      '💰 المبلغ: {{total}} ر.س' || chr(10) ||
      '💳 طريقة الدفع: {{payment_method}}' || chr(10) || chr(10) ||
      'نتطلع لرؤيتك مجدداً!' || v_review_block);
  end if;

  perform cw_send_whatsapp(NEW.phone, cw_format_template(v_tmpl, jsonb_build_object(
    'customer_name',  coalesce(NEW.customer_name, 'عزيزي العميل'),
    'company_name',   coalesce(v_co.name, ''),
    'service',        coalesce(NEW.service_name, ''),
    'total',          coalesce(round(coalesce(NEW.total_amount, NEW.price, 0))::text, '0'),
    'payment_method', v_pay,
    'maps_url',       coalesce(v_co.google_maps_url, '')
  )));

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

create or replace function public.cw_job_review_request()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Review requests are now merged into the delivery receipt message.
  -- Keep this function as a harmless no-op while legacy cron schedules exist.
  return;
end;
$function$;

create or replace function public.cw_job_post_followup()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Post-service follow-up is now merged into the delivery receipt message.
  -- Keep this function as a harmless no-op while legacy cron schedules exist.
  return;
end;
$function$;
