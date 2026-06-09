-- MADAR OS - specialized AI agents hub

create table if not exists public.ai_agent_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null check (agent_type in ('client_support', 'sales_website', 'end_customer')),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  public_token text,
  route text not null default '',
  title text not null default 'محادثة جديدة',
  visitor_name text,
  visitor_phone text,
  status text not null default 'open' check (status in ('open', 'resolved', 'ticket_created', 'lead_created')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_agent_conversations(id) on delete cascade,
  agent_type text not null check (agent_type in ('client_support', 'sales_website', 'end_customer')),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  route text not null default '',
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_agent_usage (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null check (agent_type in ('client_support', 'sales_website', 'end_customer')),
  scope_key text not null,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  usage_date date not null default current_date,
  message_count integer not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default now(),
  unique (agent_type, scope_key, usage_date)
);

create table if not exists public.ai_agent_support_tickets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_agent_conversations(id) on delete set null,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  description text not null,
  route text not null default '',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agent_sales_leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_agent_conversations(id) on delete set null,
  name text not null default 'زائر الموقع',
  phone text,
  email text,
  city text,
  business_type text,
  cars_per_day text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_agent_conversations_agent_updated_idx
  on public.ai_agent_conversations(agent_type, updated_at desc);

create index if not exists ai_agent_conversations_company_idx
  on public.ai_agent_conversations(company_id, updated_at desc);

create index if not exists ai_agent_messages_conversation_idx
  on public.ai_agent_messages(conversation_id, created_at asc);

create index if not exists ai_agent_usage_scope_idx
  on public.ai_agent_usage(agent_type, scope_key, usage_date);

create index if not exists ai_agent_support_tickets_status_idx
  on public.ai_agent_support_tickets(status, created_at desc);

create index if not exists ai_agent_sales_leads_status_idx
  on public.ai_agent_sales_leads(status, created_at desc);

alter table public.ai_agent_conversations enable row level security;
alter table public.ai_agent_messages enable row level security;
alter table public.ai_agent_usage enable row level security;
alter table public.ai_agent_support_tickets enable row level security;
alter table public.ai_agent_sales_leads enable row level security;

drop policy if exists "ai agent conversations admin read" on public.ai_agent_conversations;
create policy "ai agent conversations admin read"
  on public.ai_agent_conversations for select
  to authenticated
  using (public.get_my_role() = 'admin' or (user_id is not null and (select auth.uid()) = user_id));

drop policy if exists "ai agent messages admin read" on public.ai_agent_messages;
create policy "ai agent messages admin read"
  on public.ai_agent_messages for select
  to authenticated
  using (public.get_my_role() = 'admin' or (user_id is not null and (select auth.uid()) = user_id));

drop policy if exists "ai agent usage admin read" on public.ai_agent_usage;
create policy "ai agent usage admin read"
  on public.ai_agent_usage for select
  to authenticated
  using (public.get_my_role() = 'admin' or (user_id is not null and (select auth.uid()) = user_id));

drop policy if exists "ai agent support tickets admin read" on public.ai_agent_support_tickets;
create policy "ai agent support tickets admin read"
  on public.ai_agent_support_tickets for select
  to authenticated
  using (public.get_my_role() = 'admin' or (user_id is not null and (select auth.uid()) = user_id));

drop policy if exists "ai agent support tickets admin update" on public.ai_agent_support_tickets;
create policy "ai agent support tickets admin update"
  on public.ai_agent_support_tickets for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "ai agent sales leads admin read" on public.ai_agent_sales_leads;
create policy "ai agent sales leads admin read"
  on public.ai_agent_sales_leads for select
  to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "ai agent sales leads admin update" on public.ai_agent_sales_leads;
create policy "ai agent sales leads admin update"
  on public.ai_agent_sales_leads for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

grant select on public.ai_agent_conversations to authenticated;
grant select on public.ai_agent_messages to authenticated;
grant select on public.ai_agent_usage to authenticated;
grant select, update on public.ai_agent_support_tickets to authenticated;
grant select, update on public.ai_agent_sales_leads to authenticated;
