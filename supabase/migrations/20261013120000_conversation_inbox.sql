-- Conversation inbox: team activity on a conversation (notes, status, assignment, replies sent)
-- and saved quick replies. Additive only.

create table if not exists public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_key text not null,
  kind text not null default 'note' check (kind in ('note', 'status', 'assign', 'reply')),
  body text not null,
  assignee_user_id uuid,
  author_user_id uuid default auth.uid(),
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_events_conv on public.conversation_events (company_id, conversation_key, created_at);

alter table public.conversation_events enable row level security;

drop policy if exists conversation_events_own_company_read on public.conversation_events;
create policy conversation_events_own_company_read on public.conversation_events
  for select to authenticated using (company_id = public.get_my_clinic_company_id());

drop policy if exists conversation_events_own_company_insert on public.conversation_events;
create policy conversation_events_own_company_insert on public.conversation_events
  for insert to authenticated with check (company_id = public.get_my_clinic_company_id());

drop policy if exists conversation_events_service_all on public.conversation_events;
create policy conversation_events_service_all on public.conversation_events
  for all to service_role using (true) with check (true);

create table if not exists public.canned_replies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shortcut text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (company_id, shortcut)
);

alter table public.canned_replies enable row level security;

drop policy if exists canned_replies_own_company_all on public.canned_replies;
create policy canned_replies_own_company_all on public.canned_replies
  for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());

drop policy if exists canned_replies_service_all on public.canned_replies;
create policy canned_replies_service_all on public.canned_replies
  for all to service_role using (true) with check (true);
