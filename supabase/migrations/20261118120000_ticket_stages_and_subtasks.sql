-- Ticket board: stages each company names and orders itself, and subtasks inside a ticket. Additive only.
--   * ticket_stages: the board's columns. Each stage belongs to one of the three ticket statuses
--     (open / in_progress / resolved), so reports, filters and automations keep working on status.
--   * ai_agent_support_tickets.stage_id: the ticket's column; empty means "first stage of its status".
--   * ticket_subtasks: a checklist per ticket.

create table if not exists public.ticket_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  position integer not null default 0,
  color text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_stages_company on public.ticket_stages (company_id, position);

alter table public.ticket_stages enable row level security;
drop policy if exists ticket_stages_company on public.ticket_stages;
create policy ticket_stages_company on public.ticket_stages for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());
drop policy if exists ticket_stages_service on public.ticket_stages;
create policy ticket_stages_service on public.ticket_stages for all to service_role using (true) with check (true);

alter table public.ai_agent_support_tickets
  add column if not exists stage_id uuid references public.ticket_stages(id) on delete set null;

create table if not exists public.ticket_subtasks (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.ai_agent_support_tickets(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_subtasks_ticket on public.ticket_subtasks (ticket_id, position);
create index if not exists idx_ticket_subtasks_company on public.ticket_subtasks (company_id);

alter table public.ticket_subtasks enable row level security;
drop policy if exists ticket_subtasks_company on public.ticket_subtasks;
create policy ticket_subtasks_company on public.ticket_subtasks for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id()
              and exists (select 1 from public.ai_agent_support_tickets t where t.id = ticket_id and t.company_id = public.get_my_clinic_company_id()));
drop policy if exists ticket_subtasks_service on public.ticket_subtasks;
create policy ticket_subtasks_service on public.ticket_subtasks for all to service_role using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.ticket_subtasks, public.ticket_stages;
exception when others then null; end $$;
