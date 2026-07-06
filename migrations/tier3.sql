-- ============================================================================
-- Xwork — Tier 3 migration
-- Trust signals + onboarding support. Run AFTER tier2.sql.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

-- Client "Payment verified" badge (shown on job cards and profiles).
alter table public.profiles add column if not exists payment_verified boolean default false;

-- Tracks whether a client has finished the guided onboarding checklist.
alter table public.profiles add column if not exists client_onboarded boolean default false;

-- Messaging upgrades: file attachments. (The `read` column for read receipts
-- already exists on messages.)
alter table public.messages add column if not exists attachment_url  text;
alter table public.messages add column if not exists attachment_name text;

-- ============================================================================
-- DONE.
-- ============================================================================
