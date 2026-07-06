-- ============================================================================
-- Xwork — job talent-location preference (Worldwide or a specific country).
-- This controls where applicants may be located; it is NOT the client's country.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.jobs add column if not exists talent_location text default 'worldwide';

-- ============================================================================
-- DONE.
-- ============================================================================
