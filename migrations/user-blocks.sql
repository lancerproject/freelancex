-- ============================================================================
-- Xwork — Chat user blocks
-- A user can block another user from the chat header menu — UNLESS the two
-- have an active contract together (working relationships can't be blocked).
-- Blocking silences NEW messages in BOTH directions; history stays visible.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.user_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid references public.profiles (id) on delete cascade,
  blocked_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);

alter table public.user_blocks enable row level security;

-- Each user manages (and sees) only the blocks THEY created. Whether someone
-- else blocked you is never readable client-side — message sending is
-- enforced server-side with the service role.
drop policy if exists "own_user_blocks" on public.user_blocks;
create policy "own_user_blocks" on public.user_blocks
  for all to authenticated
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- ============================================================================
-- DONE — user_blocks ready.
-- ============================================================================
