-- Tickets can be snoozed (the reference's fourth status). Board columns may now carry that status too. Loosens a check only.
alter table public.ticket_stages drop constraint if exists ticket_stages_status_check;
alter table public.ticket_stages add constraint ticket_stages_status_check check (status in ('open', 'in_progress', 'resolved', 'snoozed'));
