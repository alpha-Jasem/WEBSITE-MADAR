-- A marketer may submit a referral of their own (under review) and nothing else.
drop policy if exists referrals_self_insert on public.referrals;
create policy referrals_self_insert on public.referrals for insert to authenticated
  with check (status = 'under_review' and deal_id is null and marketer_id in (select id from public.marketers where auth_user_id = auth.uid() and status = 'active'));
