-- What the sales agent knows (owner-written), and the website previews it can prepare for a lead.

create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'about' check (category in ('about', 'services', 'pricing', 'faq', 'objection', 'policy', 'website')),
  title text not null check (length(title) between 1 and 120),
  content text not null check (length(content) between 1 and 3000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_knowledge enable row level security;
drop policy if exists ai_knowledge_admin on public.ai_knowledge;
create policy ai_knowledge_admin on public.ai_knowledge for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.site_previews (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  lead_id uuid references public.outreach_leads(id) on delete set null,
  business_name text not null,
  html text not null,
  created_at timestamptz not null default now()
);
alter table public.site_previews enable row level security;
drop policy if exists site_previews_admin on public.site_previews;
create policy site_previews_admin on public.site_previews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A preview is opened from a link by someone who is not signed in. The long random token is the only key.
create or replace function public.get_site_preview(p_token text)
returns table (business_name text, html text)
language sql security definer set search_path = public as $$
  select business_name, html from public.site_previews where token = p_token limit 1;
$$;
revoke all on function public.get_site_preview(text) from public;
grant execute on function public.get_site_preview(text) to anon, authenticated;
