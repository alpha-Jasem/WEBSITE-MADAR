-- Lead forms the company puts on its own website (a pop-up, a form inside the page, or a floating button).
-- The public `lead-form` edge function serves the form and takes submissions; each submission is saved,
-- added to the customers, and fires the form.submitted automation, so the agent can reach out right away.
-- Additive only.

create table if not exists public.lead_forms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'popup' check (kind in ('popup', 'inline', 'button')),
  title text not null default 'تواصل معنا',
  subtitle text,
  -- [{ key, label, type: text|phone|email|textarea, required }]
  fields jsonb not null default '[{"key":"name","label":"الاسم","type":"text","required":true},{"key":"phone","label":"رقم الجوال","type":"phone","required":true}]'::jsonb,
  button_text text not null default 'أرسل',
  success_text text not null default 'وصلنا طلبك، بنتواصل معك خلال دقائق',
  -- { delay_seconds, color, position: right|left }
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  submit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lead_forms_company on public.lead_forms (company_id, created_at desc);

create table if not exists public.lead_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.lead_forms(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text,
  phone text,
  email text,
  data jsonb not null default '{}'::jsonb,
  page_url text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_form_submissions_company on public.lead_form_submissions (company_id, created_at desc);
create index if not exists idx_lead_form_submissions_ip on public.lead_form_submissions (ip_hash, created_at desc);

alter table public.lead_forms enable row level security;
alter table public.lead_form_submissions enable row level security;

drop policy if exists lead_forms_company on public.lead_forms;
create policy lead_forms_company on public.lead_forms for all to authenticated
  using (company_id = public.get_my_clinic_company_id())
  with check (company_id = public.get_my_clinic_company_id());
drop policy if exists lead_forms_service on public.lead_forms;
create policy lead_forms_service on public.lead_forms for all to service_role using (true) with check (true);

-- Submissions are written only by the edge function; the company reads them.
drop policy if exists lead_form_submissions_read on public.lead_form_submissions;
create policy lead_form_submissions_read on public.lead_form_submissions for select to authenticated
  using (company_id = public.get_my_clinic_company_id());
drop policy if exists lead_form_submissions_service on public.lead_form_submissions;
create policy lead_form_submissions_service on public.lead_form_submissions for all to service_role using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.lead_form_submissions;
exception when others then null; end $$;
