-- ============================================================================
-- Xwork — enable realtime for live "Activity on this job" updates.
-- The proposals and conversations tables must be in the supabase_realtime
-- publication for postgres_changes events to fire. (messages is already on.)
-- Run in Supabase -> SQL Editor. Safe to re-run.
-- ============================================================================

do $$
begin
  alter publication supabase_realtime add table public.proposals;
exception when others then null; -- already added — ignore
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when others then null; -- already added — ignore
end $$;

-- ============================================================================
-- DONE.
-- ============================================================================
