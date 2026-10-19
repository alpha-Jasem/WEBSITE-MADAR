-- Live admin dashboard: stream changes of the Command Center tables to the browser.
-- Row-level security still applies to Realtime, so only admins receive these rows.
do $$
declare
  t text;
begin
  foreach t in array array[
    'payments', 'refunds', 'invoices', 'quotes', 'contracts', 'expenses', 'commissions',
    'deals', 'deal_events', 'outreach_leads', 'outreach_runs', 'campaigns',
    'admin_tasks', 'agency_goals', 'agency_settings', 'integration_checks',
    'bank_notifications', 'onboarding_projects', 'onboarding_items',
    'sales_agents', 'agent_assignments', 'agent_drafts',
    'marketers', 'referrals', 'payout_statements', 'news_items', 'backup_runs',
    'conversation_state', 'sales_blitz_leads'
  ] loop
    if to_regclass('public.' || t) is not null
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
