-- ============================================================================
-- Xwork — single-use, time-limited tokens for the "Forgot security question"
-- email flow. Only the SHA-256 hash of the token is stored (the raw token
-- lives only in the emailed link). Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.security_question_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz default now()
);

create index if not exists sqr_token_hash_idx
  on public.security_question_resets (token_hash);

alter table public.security_question_resets enable row level security;

drop policy if exists sqr_select on public.security_question_resets;
create policy sqr_select on public.security_question_resets
  for select using (user_id = auth.uid());

drop policy if exists sqr_insert on public.security_question_resets;
create policy sqr_insert on public.security_question_resets
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists sqr_update on public.security_question_resets;
create policy sqr_update on public.security_question_resets
  for update using (user_id = auth.uid());

-- ============================================================================
-- DONE.
-- ============================================================================
