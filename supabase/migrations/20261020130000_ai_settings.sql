-- Owner-editable settings for Jarvis and the sales agent. One row, admin only.
create table if not exists public.ai_settings (
  id int primary key default 1 check (id = 1),
  jarvis_enabled boolean not null default true,
  jarvis_instructions text not null default '',
  jarvis_tools text[] not null default array['tasks', 'goal', 'deals', 'leads'],
  agent_product text not null default '',
  agent_instructions text not null default '',
  agent_tone text not null default 'friendly' check (agent_tone in ('friendly', 'formal')),
  updated_at timestamptz not null default now()
);
insert into public.ai_settings (id) values (1) on conflict (id) do nothing;
alter table public.ai_settings enable row level security;
drop policy if exists ai_settings_admin on public.ai_settings;
create policy ai_settings_admin on public.ai_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
