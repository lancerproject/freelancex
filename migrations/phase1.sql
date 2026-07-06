-- ============================================================================
-- Xwork — Phase 1 migration
-- Adds: richer job fields, profile fields, reviews, saved jobs, portfolio.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

-- --- Jobs: richer fields ----------------------------------------------------
alter table public.jobs add column if not exists category         text;
alter table public.jobs add column if not exists job_type         text default 'fixed';   -- 'fixed' | 'hourly'
alter table public.jobs add column if not exists experience_level text default 'intermediate'; -- 'entry'|'intermediate'|'expert'
alter table public.jobs add column if not exists duration         text;                   -- e.g. 'less_than_1_month'
alter table public.jobs add column if not exists skills           text;                   -- comma-separated
alter table public.jobs add column if not exists status           text default 'open';    -- 'open' | 'closed'

-- --- Profiles: professional fields ------------------------------------------
alter table public.profiles add column if not exists title       text;     -- professional headline
alter table public.profiles add column if not exists hourly_rate numeric;
alter table public.profiles add column if not exists avatar_url  text;

-- --- Reviews (two-way, on completed contracts) ------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete cascade,
  reviewee_id uuid references public.profiles (id) on delete cascade,
  rating      integer check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (contract_id, reviewer_id)   -- one review per person per contract
);

-- --- Saved jobs (bookmarks) -------------------------------------------------
create table if not exists public.saved_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  job_id     uuid references public.jobs (id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

-- --- Portfolio items --------------------------------------------------------
create table if not exists public.portfolio_items (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles (id) on delete cascade,
  title       text,
  description text,
  image_url   text,
  link        text,
  created_at  timestamptz default now()
);

-- --- RLS for the new tables -------------------------------------------------
alter table public.reviews         enable row level security;
alter table public.saved_jobs      enable row level security;
alter table public.portfolio_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['reviews','saved_jobs','portfolio_items']
  loop
    execute format('drop policy if exists "read_all_%1$s"  on public.%1$s;', t);
    execute format('drop policy if exists "write_auth_%1$s" on public.%1$s;', t);
    execute format('create policy "read_all_%1$s"  on public.%1$s for select using (true);', t);
    execute format('create policy "write_auth_%1$s" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
-- DONE — Phase 1 schema ready.
-- ============================================================================
