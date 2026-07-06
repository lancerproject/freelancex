-- ============================================================================
-- Xwork — Talent badges & Job Success Score snapshots
-- Adds the stored JSS (updated every 15 days), its snapshot history, the
-- earned talent badge, and the badge-ban column (policy-violation penalty).
-- Run in Supabase -> SQL Editor. Safe to re-run (all "if not exists").
-- ============================================================================

alter table public.profiles add column if not exists jss_score       numeric;
alter table public.profiles add column if not exists jss_updated_at  timestamptz;
alter table public.profiles add column if not exists jss_history     jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists talent_badge    text;  -- 'rising_talent' | 'top_rated' | 'top_rated_plus' | null
alter table public.profiles add column if not exists badge_ban_until timestamptz; -- policy violation: no badges until this date

-- ============================================================================
-- DONE — talent badge schema ready.
-- To apply a 6-month badge ban for a policy violation (payments off-platform):
--   update public.profiles
--   set talent_badge = null, badge_ban_until = now() + interval '6 months'
--   where id = '<user-id>';
-- ============================================================================
