-- Lets the integration-health function read scheduled-job state (pg_cron) without exposing the cron schema.
create or replace function public.cron_health()
returns table (jobname text, schedule text, active boolean, last_status text, last_run_at timestamptz)
language sql
stable
security definer
set search_path = public, cron
as $$
  select j.jobname::text, j.schedule::text, j.active,
         (select r.status::text from cron.job_run_details r where r.jobid = j.jobid order by r.start_time desc limit 1),
         (select r.start_time from cron.job_run_details r where r.jobid = j.jobid order by r.start_time desc limit 1)
  from cron.job j
  order by j.jobname;
$$;
revoke all on function public.cron_health() from public, anon, authenticated;
grant execute on function public.cron_health() to service_role;
