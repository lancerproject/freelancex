-- ============================================================================
-- Xwork — preferred qualifications on a job post (optional).
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.jobs add column if not exists english_level           text; -- '' | 'conversational' | 'fluent' | 'native'
alter table public.jobs add column if not exists preferred_qualifications text; -- free-text notes

-- ============================================================================
-- DONE.
-- ============================================================================
