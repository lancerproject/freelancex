-- ============================================================================
-- Xwork — Contact Info → Location columns that were missing from profiles.
-- Without `timezone`, saving the Location form failed silently (Postgres
-- rejected the unknown column), so the time zone always showed "Not set".
-- `country` is added defensively too. Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists country  text;

-- ============================================================================
-- DONE.
-- ============================================================================
