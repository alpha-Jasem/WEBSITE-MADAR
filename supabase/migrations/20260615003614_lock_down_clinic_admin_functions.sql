revoke all on function public.admin_manage_clinic_account(uuid, jsonb, uuid) from public;
revoke all on function public.admin_manage_clinic_account(uuid, jsonb, uuid) from anon;
revoke all on function public.admin_manage_clinic_account(uuid, jsonb, uuid) from authenticated;
grant execute on function public.admin_manage_clinic_account(uuid, jsonb, uuid) to service_role;

revoke all on function public.admin_activate_clinic_subscription(uuid, text, uuid) from public;
revoke all on function public.admin_activate_clinic_subscription(uuid, text, uuid) from anon;
revoke all on function public.admin_activate_clinic_subscription(uuid, text, uuid) from authenticated;
grant execute on function public.admin_activate_clinic_subscription(uuid, text, uuid) to service_role;
