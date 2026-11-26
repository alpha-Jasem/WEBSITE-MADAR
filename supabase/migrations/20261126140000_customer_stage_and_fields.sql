-- Lets a saved customer carry a lead stage and the company's own custom field values.
-- stage_id points at lead_stages (migration 20261126120000); custom_data maps custom_fields.id -> value.
-- NOT applied yet: run only after review.
alter table public.clinic_os_patients
  add column if not exists stage_id uuid references public.lead_stages(id) on delete set null,
  add column if not exists custom_data jsonb not null default '{}'::jsonb;
create index if not exists idx_clinic_os_patients_stage on public.clinic_os_patients (company_id, stage_id);
