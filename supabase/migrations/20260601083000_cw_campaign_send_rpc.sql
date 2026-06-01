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
