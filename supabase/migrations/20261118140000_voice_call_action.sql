-- New automation action: "call the customer with the voice agent". The connect-runner places the call through
-- ElevenLabs (outbound call from a phone number connected there, using the company's linked voice agent).
-- Additive only: the action list just gains 'call'.

alter table public.connect_rules drop constraint if exists connect_rules_action_type_check;
alter table public.connect_rules add constraint connect_rules_action_type_check
  check (action_type in ('webhook', 'transfer', 'ticket', 'whatsapp', 'notify', 'call'));
