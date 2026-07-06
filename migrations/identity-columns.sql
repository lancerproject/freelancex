-- ============================================================================
-- Xwork — identity verification result columns on profiles. Without these,
-- verifyIdentity()'s UPDATE is rejected and verification never persists.
-- (id_number / id_type / id_dob / identity_fingerprint come from identity-dedup.sql.)
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists id_verified    boolean default false;
alter table public.profiles add column if not exists id_verified_at timestamptz;
alter table public.profiles add column if not exists id_doc_front   text;
alter table public.profiles add column if not exists id_doc_back    text;
alter table public.profiles add column if not exists id_selfie      text;
alter table public.profiles add column if not exists id_legal_name  text;
alter table public.profiles add column if not exists id_face_score  numeric;

-- ============================================================================
-- DONE.
-- ============================================================================
