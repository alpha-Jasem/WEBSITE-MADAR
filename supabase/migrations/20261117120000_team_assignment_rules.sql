-- Smart assignment per team: who gets the next conversation and how long it may wait for a reply. Additive only.

create table if not exists public.team_assignment_rules (
  team_id uuid primary key references public.company_teams(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  enabled boolean not null default false,
  strategy text not null default 'least_busy' check (strategy in ('least_busy', 'round_robin')),
  max_open integer not null default 0 check (max_open >= 0),
  sla_minutes integer not null default 0 check (sla_minutes >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists idx_team_assignment_rules_company on public.team_assignment_rules (company_id);

alter table public.team_assignment_rules enable row level security;

-- Everyone in the company reads the rules (the inbox applies them); only the account owner changes them.
drop policy if exists team_assignment_rules_read on public.team_assignment_rules;
create policy team_assignment_rules_read on public.team_assignment_rules for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
drop policy if exists team_assignment_rules_owner_write on public.team_assignment_rules;
create policy team_assignment_rules_owner_write on public.team_assignment_rules for all to authenticated
  using (company_id in (select id from public.companies where auth_user_id = auth.uid()))
  with check (company_id in (select id from public.companies where auth_user_id = auth.uid()));
drop policy if exists team_assignment_rules_service on public.team_assignment_rules;
create policy team_assignment_rules_service on public.team_assignment_rules for all to service_role using (true) with check (true);
