-- MADAR OS - scoped AI assistant conversations, messages, and daily usage

create table if not exists public.ai_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  portal text not null check (portal in ('client', 'admin')),
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_assistant_conversations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  portal text not null check (portal in ('client', 'admin')),
  route text not null default '',
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_assistant_usage (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  portal text not null check (portal in ('client', 'admin')),
  usage_date date not null default current_date,
  message_count integer not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default now(),
  unique (scope_key, usage_date)
);

create index if not exists ai_assistant_conversations_user_idx
  on public.ai_assistant_conversations(user_id, updated_at desc);

create index if not exists ai_assistant_conversations_company_idx
  on public.ai_assistant_conversations(company_id, updated_at desc);

create index if not exists ai_assistant_messages_conversation_idx
  on public.ai_assistant_messages(conversation_id, created_at asc);

create index if not exists ai_assistant_usage_scope_date_idx
  on public.ai_assistant_usage(scope_key, usage_date);

alter table public.ai_assistant_conversations enable row level security;
alter table public.ai_assistant_messages enable row level security;
alter table public.ai_assistant_usage enable row level security;

drop policy if exists "ai conversations readable by owner or admin" on public.ai_assistant_conversations;
create policy "ai conversations readable by owner or admin"
  on public.ai_assistant_conversations
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.get_my_role() = 'admin');

drop policy if exists "ai conversations insertable by owner" on public.ai_assistant_conversations;
create policy "ai conversations insertable by owner"
  on public.ai_assistant_conversations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ai messages readable by owner or admin" on public.ai_assistant_messages;
create policy "ai messages readable by owner or admin"
  on public.ai_assistant_messages
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.get_my_role() = 'admin');

drop policy if exists "ai messages insertable by owner" on public.ai_assistant_messages;
create policy "ai messages insertable by owner"
  on public.ai_assistant_messages
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ai usage readable by owner or admin" on public.ai_assistant_usage;
create policy "ai usage readable by owner or admin"
  on public.ai_assistant_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.get_my_role() = 'admin');

grant select, insert on public.ai_assistant_conversations to authenticated;
grant select, insert on public.ai_assistant_messages to authenticated;
grant select on public.ai_assistant_usage to authenticated;
