-- ============================================================================
-- Xwork — Tier 2 migration
-- Adds everything the Tier 2 features need: dispute columns, moderation
-- columns, admin flag, payout methods, and the connects ledger table.
-- Run in Supabase -> SQL Editor. Safe to re-run (all "if not exists").
-- ============================================================================

-- --- Contracts: dispute fields ---------------------------------------------
alter table public.contracts add column if not exists dispute_reason text;
alter table public.contracts add column if not exists disputed_by    uuid references public.profiles (id);
alter table public.contracts add column if not exists disputed_at    timestamptz;

-- --- Profiles: moderation + admin ------------------------------------------
alter table public.profiles add column if not exists warnings          integer    default 0;
alter table public.profiles add column if not exists suspended         boolean    default false;
alter table public.profiles add column if not exists suspended_at      timestamptz;
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists is_admin          boolean    default false;

-- --- Payout / withdrawal methods -------------------------------------------
-- We store only a masked label (e.g. last 4 of an account, or a PayPal email
-- with the domain). Real bank/card numbers are NEVER stored here.
create table if not exists public.payout_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  type        text,        -- 'paypal' | 'payoneer' | 'bank'
  label       text,        -- masked, display-only (e.g. "Bank •••• 4821")
  details     text,        -- non-sensitive descriptor (account holder name, etc.)
  is_default  boolean default false,
  created_at  timestamptz default now()
);

-- --- Connects ledger (referenced by the connects history page) --------------
create table if not exists public.connects_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  amount      integer,
  description text,
  job_id      uuid references public.jobs (id) on delete set null,
  created_at  timestamptz default now()
);

-- --- RLS --------------------------------------------------------------------
alter table public.payout_methods        enable row level security;
alter table public.connects_transactions enable row level security;

-- payout_methods: a user can only see / manage their OWN methods.
drop policy if exists "own_payout_select" on public.payout_methods;
drop policy if exists "own_payout_write"  on public.payout_methods;
create policy "own_payout_select" on public.payout_methods
  for select to authenticated using (auth.uid() = user_id);
create policy "own_payout_write" on public.payout_methods
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- connects_transactions: a user can only read their own ledger.
drop policy if exists "own_connects_select" on public.connects_transactions;
drop policy if exists "own_connects_write"  on public.connects_transactions;
create policy "own_connects_select" on public.connects_transactions
  for select to authenticated using (auth.uid() = user_id);
create policy "own_connects_write" on public.connects_transactions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- DONE — Tier 2 schema ready.
-- To make yourself an admin, run (replace the email):
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
-- ============================================================================
