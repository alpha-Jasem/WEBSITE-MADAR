-- Outreach sales tracking: follow-ups, meetings, lost reasons, contact history.
alter table public.outreach_leads
  add column if not exists next_follow_up timestamptz,
  add column if not exists meeting_at timestamptz,
  add column if not exists lost_reason text not null default '',
  add column if not exists last_contacted_at timestamptz,
  add column if not exists contact_count int not null default 0;

create index if not exists outreach_leads_follow_up_idx on public.outreach_leads(next_follow_up) where next_follow_up is not null;
