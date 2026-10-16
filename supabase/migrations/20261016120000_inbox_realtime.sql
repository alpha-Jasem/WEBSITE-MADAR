-- Inbox live updates: clinic_os_messages (WhatsApp / chat messages) was missing from the
-- realtime publication, so new messages only appeared after a manual refresh.
-- RLS already limits every row to its own company, so tenant isolation is unchanged.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clinic_os_messages') then
    alter publication supabase_realtime add table public.clinic_os_messages;
  end if;
end $$;

-- Full old rows so DELETE and filtered UPDATE events carry company_id.
alter table public.clinic_os_messages replica identity full;
alter table public.clinic_os_ai_calls replica identity full;
alter table public.conversation_events replica identity full;
