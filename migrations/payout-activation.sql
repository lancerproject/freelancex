-- ============================================================================
-- Xwork — Withdrawal method activation (security period)
-- New withdrawal methods take up to 3 days to activate before they can be
-- used for a payout. Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.payout_methods add column if not exists active_at timestamptz;

-- Existing methods were added before the security period existed — treat them
-- as already active.
update public.payout_methods set active_at = created_at where active_at is null;

-- ============================================================================
-- DONE.
-- ============================================================================
