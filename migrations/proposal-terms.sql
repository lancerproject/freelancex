-- ============================================================================
-- Xwork — richer proposals (Upwork-style "Submit a proposal" terms).
-- Adds payment terms, milestones, duration estimate and attachments.
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.proposals add column if not exists payment_type text default 'project'; -- 'milestone' | 'project'
alter table public.proposals add column if not exists milestones   jsonb;  -- [{ description, due_date, amount }]
alter table public.proposals add column if not exists duration     text;   -- freelancer's time estimate
alter table public.proposals add column if not exists attachments  jsonb;  -- [{ url, name }]

-- ============================================================================
-- DONE.
-- ============================================================================
