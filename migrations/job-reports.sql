-- ============================================================================
-- Xwork — freelancer "Flag / Report a job" reports. One report per freelancer
-- per job (enforced by the unique constraint). `status` is for the future admin
-- review UI. Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.job_reports (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs (id) on delete cascade,
  freelancer_id uuid references public.profiles (id) on delete cascade,
  reason        text not null,           -- 'fraud' | 'inappropriate' | 'tos' | 'spam' | 'other'
  description   text,                    -- required only when reason = 'other'
  status        text default 'pending',  -- 'pending' | 'reviewing' | 'actioned' | 'dismissed' (admin later)
  created_at    timestamptz default now(),
  unique (job_id, freelancer_id)         -- prevents duplicate reports
);

create index if not exists job_reports_job_idx on public.job_reports (job_id);

alter table public.job_reports enable row level security;

-- A freelancer can see and create only their own reports. (Admin review will
-- read across all rows via the service role, added when that UI is built.)
drop policy if exists job_reports_select on public.job_reports;
create policy job_reports_select on public.job_reports
  for select using (freelancer_id = auth.uid());

drop policy if exists job_reports_insert on public.job_reports;
create policy job_reports_insert on public.job_reports
  for insert to authenticated with check (freelancer_id = auth.uid());

-- ============================================================================
-- DONE.
-- ============================================================================
