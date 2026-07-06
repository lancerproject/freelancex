-- ============================================================================
-- Xwork — per-user notification preferences (Settings → Notifications).
-- Shape: { "<category>": { "inapp": bool, "email": bool }, ... }.
-- NULL means "use defaults" (most on, marketing off). Run in Supabase → SQL Editor.
-- ============================================================================

alter table public.profiles add column if not exists notification_prefs jsonb;

-- ============================================================================
-- DONE.
-- ============================================================================
