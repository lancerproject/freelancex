import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { gateway } from "@/lib/escrow/gateway";

// Escrow background jobs. Trigger on a schedule (Render Cron / any external
// scheduler) with the shared secret:  GET /api/cron/escrow?key=CRON_SECRET
// Each job just calls the locked DB functions, which re-check status under a
// row lock — so even overlapping runs can never double-process a milestone.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const out = { auto_approved: 0, cleared: 0, auto_refunded: 0, paid_out: 0, errors: [] as string[] };

  // 1) Auto-approve: IN_REVIEW past its 5-day review deadline.
  const { data: due1 } = await admin
    .from("milestones")
    .select("id, contract_id, contracts:contract_id ( freelancer_id, title )")
    .eq("escrow_status", "IN_REVIEW")
    .lte("auto_approve_at", now);
  for (const m of due1 ?? []) {
    const { error } = await admin.rpc("escrow_approve_milestone", { p_milestone: m.id, p_actor: null, p_auto: true });
    if (error) { out.errors.push(`approve ${m.id}: ${error.message}`); continue; }
    out.auto_approved++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (m as any).contracts;
    await notify(admin, c?.freelancer_id, "payment", "Milestone auto-approved",
      `The client didn't respond in time, so "${c?.title}" was auto-approved. Your earnings are clearing.`,
      `/contracts/${m.contract_id}`).catch(() => {});
  }

  // 2) Clearance: PENDING past its 3-day security hold → AVAILABLE.
  const { data: due2 } = await admin
    .from("milestones")
    .select("id")
    .eq("escrow_status", "PENDING")
    .lte("security_period_ends_at", now);
  for (const m of due2 ?? []) {
    const { error } = await admin.rpc("escrow_clear_milestone", { p_milestone: m.id });
    if (error) out.errors.push(`clear ${m.id}: ${error.message}`);
    else out.cleared++;
  }

  // 3) Auto-refund: cancellation window elapsed with no freelancer action.
  const { data: due3 } = await admin
    .from("milestones")
    .select("id, contract_id, contracts:contract_id ( client_id, title )")
    .eq("escrow_status", "CANCELLATION_WINDOW")
    .lte("cancellation_window_ends_at", now);
  for (const m of due3 ?? []) {
    const { error } = await admin.rpc("escrow_refund_milestone", { p_milestone: m.id, p_actor: null, p_auto: true });
    if (error) { out.errors.push(`refund ${m.id}: ${error.message}`); continue; }
    out.auto_refunded++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (m as any).contracts;
    await notify(admin, c?.client_id, "payment", "Milestone auto-refunded",
      `The 7-day window passed with no action, so "${c?.title}" was refunded to your original payment method.`,
      `/contracts/${m.contract_id}`).catch(() => {});
  }

  // 4) Gateway payout processor: push requested withdrawals to the pipe.
  const { data: wds } = await admin
    .from("withdrawals")
    .select("id, user_id, amount, method_label")
    .eq("status", "requested");
  for (const w of wds ?? []) {
    const res = await gateway.payout({
      userId: w.user_id, amount: Number(w.amount), currency: "USD",
      methodToken: "sim", idempotencyKey: `wd:${w.id}`,
    });
    if (res.ok) {
      await admin.from("withdrawals").update({
        status: "paid", gateway_reference: res.reference, processed_at: now,
      }).eq("id", w.id);
      out.paid_out++;
      await notify(admin, w.user_id, "payments", "Withdrawal sent",
        `Your withdrawal of $${Number(w.amount).toFixed(2)} has been sent.`, `/withdraw`).catch(() => {});
    } else if (!res.retryable) {
      await admin.from("withdrawals").update({ status: "failed", failure_reason: res.error }).eq("id", w.id);
      out.errors.push(`payout ${w.id}: ${res.error}`);
    }
    // retryable failures are left as 'requested' for the next run
  }

  return NextResponse.json({ ran_at: now, ...out });
}
