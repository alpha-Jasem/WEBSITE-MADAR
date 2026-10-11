-- Per-company dashboard sections.
-- Each company's sections come from its industry preset (src/dashboard/modules.ts); this column
-- only stores admin overrides of that preset, e.g. {"reviews": false, "voice": true}.
-- An empty object means "use the industry preset", so existing companies are unaffected.
alter table public.companies
  add column if not exists dashboard_modules jsonb not null default '{}'::jsonb;

comment on column public.companies.dashboard_modules is
  'Admin overrides of the industry dashboard preset: {module_id: boolean}. Empty = preset only.';
