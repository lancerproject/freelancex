-- ============================================================================
-- Xwork — saved searches (power the freelancer "My Feed").
-- A freelancer saves a search (query + category + filters); "My Feed" then
-- shows newest jobs matching any of their saved searches.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.saved_searches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles (id) on delete cascade,
  query            text,
  category         text,
  experience_level text,
  min_budget       numeric,
  created_at       timestamptz default now()
);

alter table public.saved_searches enable row level security;

drop policy if exists "own_searches_select" on public.saved_searches;
drop policy if exists "own_searches_write"  on public.saved_searches;
create policy "own_searches_select" on public.saved_searches
  for select to authenticated using (auth.uid() = user_id);
create policy "own_searches_write" on public.saved_searches
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- DONE.
-- ============================================================================
