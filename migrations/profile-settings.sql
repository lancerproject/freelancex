-- ============================================================================
-- Xwork — Profile Settings fields (visibility/username already exist).
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists hide_earnings      boolean default false;
alter table public.profiles add column if not exists experience_level   text;    -- 'entry' | 'intermediate' | 'expert'
alter table public.profiles add column if not exists project_preference text;    -- 'both' | 'short_term' | 'long_term'

-- ============================================================================
-- DONE.
-- ============================================================================
