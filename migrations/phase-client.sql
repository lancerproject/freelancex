-- ============================================================================
-- Xwork — Complete client-side features
-- Adds: job fields (project_size, contract_to_hire), saved talent,
--       time logs (timesheets/work diaries), coworker invites.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.jobs add column if not exists project_size     text;
alter table public.jobs add column if not exists contract_to_hire text;

create table if not exists public.saved_talent (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  talent_id  uuid references public.profiles (id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, talent_id)
);

create table if not exists public.time_logs (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid references public.contracts (id) on delete cascade,
  freelancer_id uuid references public.profiles (id) on delete cascade,
  client_id     uuid references public.profiles (id) on delete cascade,
  work_date     date,
  hours         numeric,
  description   text,
  created_at    timestamptz default now()
);

create table if not exists public.coworker_invites (
  id         uuid primary key default gen_random_uuid(),
  inviter_id uuid references public.profiles (id) on delete cascade,
  email      text,
  role       text,
  created_at timestamptz default now()
);

alter table public.saved_talent     enable row level security;
alter table public.time_logs        enable row level security;
alter table public.coworker_invites enable row level security;

do $$
declare t text;
begin
  foreach t in array array['saved_talent','time_logs','coworker_invites']
  loop
    execute format('drop policy if exists "read_all_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "write_auth_%1$s" on public.%1$s;', t);
    -- SECURITY: blanket read_all/write_auth removed — they nullify per-user RLS.
    -- Per-user policies live in migrations/rls-security.sql + rls-hardening.sql.
  end loop;
end $$;

-- ============================================================================
-- DONE.
-- ============================================================================
