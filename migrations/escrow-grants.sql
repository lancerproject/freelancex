-- =====================================================================
-- xWork escrow — lock down the money functions (CRITICAL SECURITY)
-- =====================================================================
-- The escrow_* functions are SECURITY DEFINER, so they move money as the
-- owner regardless of who calls them. If PostgREST left them EXECUTE-able by
-- anon/authenticated, any logged-in user could POST /rpc/escrow_approve_...
-- with someone else's milestone id and release funds. So we revoke EXECUTE
-- from everyone and grant it only to service_role — meaning they can ONLY be
-- reached through app/escrow/actions.ts, which authenticates + authorizes the
-- caller first. Safe/idempotent to re-run.
-- =====================================================================

revoke execute on function escrow_fund_milestone(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function escrow_submit_work(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function escrow_approve_milestone(uuid, uuid, boolean, int) from public, anon, authenticated;
revoke execute on function escrow_reject_milestone(uuid, uuid) from public, anon, authenticated;
revoke execute on function escrow_cancel_milestone(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function escrow_refund_milestone(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function escrow_open_dispute(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function escrow_resolve_dispute(uuid, uuid, dispute_resolution, numeric, numeric, text, int) from public, anon, authenticated;
revoke execute on function escrow_clear_milestone(uuid) from public, anon, authenticated;
revoke execute on function escrow_request_withdrawal(uuid, numeric, text, numeric, text) from public, anon, authenticated;

grant execute on function escrow_fund_milestone(uuid, uuid, text) to service_role;
grant execute on function escrow_submit_work(uuid, uuid, int) to service_role;
grant execute on function escrow_approve_milestone(uuid, uuid, boolean, int) to service_role;
grant execute on function escrow_reject_milestone(uuid, uuid) to service_role;
grant execute on function escrow_cancel_milestone(uuid, uuid, int) to service_role;
grant execute on function escrow_refund_milestone(uuid, uuid, boolean) to service_role;
grant execute on function escrow_open_dispute(uuid, uuid, text) to service_role;
grant execute on function escrow_resolve_dispute(uuid, uuid, dispute_resolution, numeric, numeric, text, int) to service_role;
grant execute on function escrow_clear_milestone(uuid) to service_role;
grant execute on function escrow_request_withdrawal(uuid, numeric, text, numeric, text) to service_role;
