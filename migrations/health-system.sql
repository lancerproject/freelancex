-- ============================================================================
-- Xwork — Account Health system
-- Health score (0–100) driven ONLY by real violations, policy breaches, bad
-- reviews and boosts — profile completion never affects it.
-- Run in Supabase -> SQL Editor. Safe to re-run (all "if not exists").
-- ============================================================================

-- --- Profiles: stored health state ------------------------------------------
alter table public.profiles add column if not exists health_score          integer default 100;
alter table public.profiles add column if not exists health_badge          text    default 'excellent';
alter table public.profiles add column if not exists health_last_updated   timestamptz;
alter table public.profiles add column if not exists health_previous_score integer; -- score at the user's last health-page visit

-- --- Violations ---------------------------------------------------------------
create table if not exists public.violations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete cascade,
  violation_type  text,     -- see lib/health.ts VIOLATION_CATALOG for allowed keys
  severity        text,     -- 'critical' | 'high' | 'medium' | 'low'
  points_deducted integer,
  description     text,
  status          text default 'active',  -- 'active' | 'under_review' | 'resolved'
  recorded_at     timestamptz default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references public.profiles (id) on delete set null,
  metadata        jsonb
);
create index if not exists violations_user_idx on public.violations (user_id, status);

-- --- Health score change log --------------------------------------------------
create table if not exists public.health_score_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete cascade,
  old_score     integer,
  new_score     integer,
  old_badge     text,
  new_badge     text,
  trigger_event text,
  calculated_at timestamptz default now()
);
create index if not exists health_log_user_idx on public.health_score_log (user_id);

-- --- RLS ----------------------------------------------------------------------
alter table public.violations       enable row level security;
alter table public.health_score_log enable row level security;

-- A freelancer reads only their own violations / score history. All writes go
-- through the service role (lib/health.ts), so no insert/update policies.
drop policy if exists "own_violations_select" on public.violations;
create policy "own_violations_select" on public.violations
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own_health_log_select" on public.health_score_log;
create policy "own_health_log_select" on public.health_score_log
  for select to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- DONE — health schema ready.
-- ============================================================================
