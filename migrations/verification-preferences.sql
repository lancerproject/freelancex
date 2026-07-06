-- ============================================================================
-- Xwork — two-step verification preferences (the ⚙ on the security page).
--   twofa_preferred_method : which method to try first ('authenticator' | 'mobile' | 'sms')
--   twofa_frequency        : 'risky' (only risky logins) | 'every' (every login + risky)
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists twofa_preferred_method text,
  add column if not exists twofa_frequency        text default 'risky';

-- ============================================================================
-- DONE.
-- ============================================================================
