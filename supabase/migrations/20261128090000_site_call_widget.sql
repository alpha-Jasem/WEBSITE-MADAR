-- Web-call widget: a call button on the company's website that connects visitors to one of its
-- voice agents in the browser. It shares the chat widget's row and public key. Additive only.
-- The public token function (web-call-token) checks the agent is linked to the company and,
-- when the list is set, that the page's origin is allowed.

alter table public.site_widgets add column if not exists call_enabled boolean not null default false;
alter table public.site_widgets add column if not exists call_agent_id text;
alter table public.site_widgets add column if not exists call_label text not null default 'اتصل بنا';
alter table public.site_widgets add column if not exists call_allowed_origins text[] not null default '{}';
