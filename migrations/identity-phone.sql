-- ============================================================================
-- Xwork — Identity manual review + phone verification
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

-- Manual review queue for identity verification (when automatic face
-- matching couldn't run): pending | approved | rejected.
alter table public.profiles add column if not exists id_review_status text;
alter table public.profiles add column if not exists id_review_note text;

-- Phone verification (OTP code, hashed, 10-minute expiry).
alter table public.profiles add column if not exists phone_verified_at timestamptz;
alter table public.profiles add column if not exists phone_otp_hash text;
alter table public.profiles add column if not exists phone_otp_expires timestamptz;

-- ============================================================================
-- DONE.
-- ============================================================================
