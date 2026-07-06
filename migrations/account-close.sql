-- ============================================================================
-- Xwork — account closure (soft close / deactivate).
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists closed boolean default false;

-- ============================================================================
-- DONE.
-- ============================================================================
