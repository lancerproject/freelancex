-- ============================================================================
-- Xwork — structured contact address (used by Contact Info → Location, and
-- prefilled into the tax form's address).
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists address1    text;
alter table public.profiles add column if not exists address2    text;
alter table public.profiles add column if not exists city        text;
alter table public.profiles add column if not exists state       text;
alter table public.profiles add column if not exists postal_code text;

-- ============================================================================
-- DONE.
-- ============================================================================
