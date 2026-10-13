-- Every stored conversation now feeds the rest of the dashboard on its own:
--   * a bell notification
--   * a follow-up ticket when the customer asked for a call-back / follow-up and left a number
--     (calls that need review keep getting their ticket from agent-call-webhook)
--   * questions the agent could not answer -> agent_unanswered_questions (knowledge base page)
--   * the WhatsApp integration flips to connected once a WhatsApp conversation arrives
-- Each step is isolated so it can never block a call from being stored.
-- Applied to the project in three steps: function, trigger, realtime publication.

-- create or replace function public.clinic_os_after_call_insert() ... (see the applied version)

create trigger trg_clinic_os_after_call_insert after insert on public.clinic_os_ai_calls
for each row execute function public.clinic_os_after_call_insert();

alter publication supabase_realtime add table public.conversation_events;
