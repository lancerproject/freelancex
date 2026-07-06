-- ============================================================================
-- Xwork — Escrow-aware contract closure + dispute-center ticket link
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

-- When a CLIENT ends a contract that still holds escrow, the freelancer gets
-- a decision window (default 7 days) to either refund the escrow to the
-- client or open a dispute. These columns track that window.
alter table public.contracts add column if not exists pending_closure_by uuid;
alter table public.contracts add column if not exists closure_deadline timestamptz;

-- Dispute tickets live in the request/support center. Link a ticket back to
-- the contract it came from (nullable — normal support tickets have none).
alter table public.support_tickets add column if not exists contract_id uuid references public.contracts(id) on delete set null;

-- ============================================================================
-- DONE.
-- ============================================================================
