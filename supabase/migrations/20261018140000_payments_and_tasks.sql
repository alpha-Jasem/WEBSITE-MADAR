-- Real collection ledger and the owner's daily tasks.
-- A payment counts as collected only when status = 'confirmed' (confirmed by the owner). An email or a
-- claim alone never becomes collection. Rows are never deleted from the app (no delete policy).

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete set null,
  customer_name text not null,
  method text not null default 'bank_transfer' check (method in ('bank_transfer', 'moyasar', 'cash', 'other')),
  status text not null default 'pending_verification' check (status in ('pending_verification', 'confirmed', 'rejected')),
  total_amount numeric not null check (total_amount > 0),
  vat_included boolean not null default true,
  vat_rate numeric not null default 15 check (vat_rate >= 0 and vat_rate <= 100),
  net_amount numeric not null check (net_amount >= 0),
  tax_amount numeric not null check (tax_amount >= 0),
  currency text not null default 'SAR',
  reference text not null default '',
  note text not null default '',
  sourced_by text not null default '',
  closed_by text not null default '',
  received_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id),
  rejected_reason text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint payments_confirmed_has_actor check (status <> 'confirmed' or (confirmed_at is not null and confirmed_by is not null)),
  constraint payments_amounts_add_up check (abs((net_amount + tax_amount) - total_amount) < 0.01)
);
create unique index if not exists payments_reference_key on public.payments (reference) where reference <> '';
create index if not exists payments_confirmed_idx on public.payments (confirmed_at desc) where status = 'confirmed';
create index if not exists payments_status_idx on public.payments (status);
alter table public.payments enable row level security;
create policy payments_admin_select on public.payments for select to authenticated using (public.is_admin());
create policy payments_admin_insert on public.payments for insert to authenticated with check (public.is_admin());
create policy payments_admin_update on public.payments for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  done boolean not null default false,
  done_at timestamptz,
  deal_id uuid references public.deals(id) on delete set null,
  source text not null default 'local' check (source in ('local', 'todoist')),
  external_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists admin_tasks_external_key on public.admin_tasks (source, external_id) where external_id is not null;
alter table public.admin_tasks enable row level security;
create policy admin_tasks_admin on public.admin_tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());
