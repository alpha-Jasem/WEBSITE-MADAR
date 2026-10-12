-- Platform call analysis kept with each call (ElevenLabs: success verdict and score, title,
-- evaluation criteria, collected data, sentiment, cost, termination reason, audio availability).
alter table public.clinic_os_ai_calls add column if not exists analysis jsonb;
