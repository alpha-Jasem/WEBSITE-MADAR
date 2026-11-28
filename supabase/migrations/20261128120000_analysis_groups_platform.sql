-- Analysis groups now live on the voice platform too: each dashboard group remembers its platform id and the
-- agents it is attached to (so a company chooses which of its agents runs it). Additive only.
alter table public.analysis_groups add column if not exists nabrah_id text;
alter table public.analysis_groups add column if not exists agent_ids text[] not null default '{}';
