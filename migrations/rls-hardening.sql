-- ===========================================================================
-- Xwork — RLS HARDENING (fixes the 2026-07-14 security-audit criticals)
-- Safe to run more than once.
--
-- #1  Early setup scripts (supabase-setup.sql, phase1.sql, phase-client.sql)
--     created blanket "read_all_<t>" (select using true) and "write_auth_<t>"
--     (for all to authenticated using true) policies on 15 core tables.
--     Postgres OR-combines permissive policies, so these silently NULLIFIED the
--     later owner-scoped policies — every authenticated user could read/write
--     every row, and messages/conversations/contracts were world-readable via
--     the public anon key. Drop them; the owner-scoped policies in
--     rls-security.sql then actually govern access.
--
-- #2  The escrow money tables never had RLS enabled, so anyone with the public
--     anon key could read the whole ledger and rewrite fee_rules. Enable RLS.
--     They're only touched by service-role RPC functions (which bypass RLS),
--     so deny-all is correct — except escrow_disputes, which the close-account
--     guard reads (scoped to the opener).
--
-- Plus the 3 owner-scoped policies the app needs that were only ever satisfied
-- by the blanket grant, and closing the private-feedback column exposure.
-- ===========================================================================

-- ---- #1  Drop the blanket policies on all 15 tables -----------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','jobs','proposals','contracts','milestones',
    'conversations','messages','notifications','contract_files',
    'reviews','saved_jobs','portfolio_items',
    'saved_talent','time_logs','coworker_invites'
  ]
  loop
    execute format('drop policy if exists "read_all_%1$s"  on public.%1$s;', t);
    execute format('drop policy if exists "write_auth_%1$s" on public.%1$s;', t);
  end loop;
end $$;

-- ---- Owner-scoped policies the app relies on (were covered by the blanket
--      write grant). Without these, dropping the blanket policies would break
--      ending a chat, read receipts / offer-card flips, and feedback upserts.
drop policy if exists conversations_update on public.conversations;
create policy conversations_update on public.conversations for update
  using (participant_1 = auth.uid() or participant_2 = auth.uid())
  with check (participant_1 = auth.uid() or participant_2 = auth.uid());

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update
  using (
    exists (select 1 from public.conversations c
            where c.id = messages.conversation_id
              and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid()))
  )
  with check (
    exists (select 1 from public.conversations c
            where c.id = messages.conversation_id
              and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid()))
  );

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- ---- Private feedback must never leak. reviews are public-read (rating +
--      comment show on profiles), but private_rating/private_comment are
--      staff-only. RLS is row-level, so hide these COLUMNS from the public
--      API roles; the service role (staff/admin reads) still sees them.
revoke select (private_rating, private_comment) on public.reviews from anon;
revoke select (private_rating, private_comment) on public.reviews from authenticated;

-- ---- #2  Lock the escrow money tables -------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'escrow_transactions','fee_rules','escrow_disputes',
    'chargebacks','escrow_audit_log'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%1$s enable row level security;', t);
    end if;
  end loop;
end $$;

-- The close-account guard reads the disputes a user opened, so allow just that
-- (everything else on these tables is service-role only = deny-all).
drop policy if exists escrow_disputes_select_own on public.escrow_disputes;
create policy escrow_disputes_select_own on public.escrow_disputes for select
  using (opened_by = auth.uid());

notify pgrst, 'reload schema';
