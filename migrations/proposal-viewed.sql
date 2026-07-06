-- ============================================================================
-- Xwork — "proposal viewed" tracking. When a client opens a job's proposals,
-- each freelancer is notified once. viewed_at guards against re-notifying.
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.proposals add column if not exists viewed_at timestamptz;

-- ============================================================================
-- DONE.
-- ============================================================================
