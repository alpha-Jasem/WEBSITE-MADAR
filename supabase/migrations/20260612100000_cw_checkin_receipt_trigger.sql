-- رسالة استقبال السيارة: تُرسل فور إضافة السيارة للقائمة

-- دالة الـ trigger
create or replace function public.cw_trigger_checkin_receipt()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_co record;
  v_tmpl text;
begin
  -- فقط عند إدراج صف جديد وعندما يكون الرقم موجوداً
  if NEW.phone is null then return NEW; end if;

  select name, cw_message_templates, cw_automations into v_co
  from public.companies where id = NEW.company_id;

  -- التحقق من أن الـ automation مفعّل
  if not cw_automation_enabled(v_co.cw_automations, 'checkin_receipt') then return NEW; end if;

  v_tmpl := coalesce(
    v_co.cw_message_templates->>'checkin_receipt',
    'مرحباً {{customer_name}} 👋' || chr(10) ||
    'تم استلام سيارتك لدى {{company_name}}' || chr(10) ||
    'الخدمة: {{service}}' || chr(10) ||
    'جاري خدمتك الآن، سنُخطرك فور الانتهاء ✅'
  );

  perform cw_send_whatsapp(NEW.phone, cw_format_template(v_tmpl, jsonb_build_object(
    'customer_name', coalesce(NEW.customer_name, 'عزيزي العميل'),
    'company_name',  coalesce(v_co.name, ''),
    'service',       coalesce(NEW.service_name, '')
  )));

  perform public.cw_increment_message_usage(NEW.company_id, 1);

  return NEW;
end;
$function$;

-- ربط الـ trigger بجدول cw_queue عند الإدراج
drop trigger if exists trg_cw_checkin_receipt on public.cw_queue;
create trigger trg_cw_checkin_receipt
  after insert on public.cw_queue
  for each row
  execute function public.cw_trigger_checkin_receipt();
