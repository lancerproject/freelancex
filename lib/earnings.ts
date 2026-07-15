// Freelancer earnings — the single source of truth for balances.
//
// Sourced from the xWork escrow engine (append-only ledger + milestone
// escrow_status), not the legacy job_payments table:
//   * work-in-progress  = gross of FUNDED / IN_REVIEW milestones (no fee yet)
//   * pending           = net of PENDING milestones still clearing (fee cut)
//   * available         = net of cleared (AVAILABLE/WITHDRAWN) milestones,
//                         minus balance already spent (Pro membership) and
//                         minus money already withdrawn.
// The engine tables are RLS-locked, so we read them with the service-role
// client (server-only); balanceSpent/withdrawn come from the caller's client.

import { netFromGross, feeRate, type Plan } from "./fees";
import { createAdminClient } from "./supabase-admin";

export type EarningLine = {
  id: string;
  jobId: string | null;
  gross: number;
  feeRate: number;
  fee: number;
  net: number;
  plan: string;
  date: string | null;
};

export type Earnings = {
  available: number; // spendable now
  pending: number; // in escrow, not yet available (WIP + clearing), netted
  workInProgress: number; // gross of FUNDED/IN_REVIEW (shown gross, no fee yet)
  lifetime: number; // gross of all approved milestones
  lifetimeNet: number; // net of all approved milestones
  balanceSpent: number; // paid out of balance (membership etc.)
  withdrawn: number; // already withdrawn to a payout method
  feeRate: number; // the freelancer's current fee rate
  breakdown: EarningLine[];
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function getFreelancerEarnings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  plan: Plan
): Promise<Earnings> {
  const admin = createAdminClient();

  // The freelancer's milestones + their escrow state (service role).
  const { data: msRows } = await admin
    .from("milestones")
    .select("id, amount, escrow_status, job_id, approved_at, contracts!inner ( freelancer_id )")
    .eq("contracts.freelancer_id", userId);
  const ms = msRows ?? [];
  const ids = ms.map((m: { id: string }) => m.id);

  // The net (post-fee) release amount per milestone, from the ledger.
  const netByMilestone = new Map<string, number>();
  if (ids.length) {
    const { data: rel } = await admin
      .from("escrow_transactions")
      .select("milestone_id, amount")
      .eq("type", "release")
      .in("milestone_id", ids);
    for (const r of rel ?? []) {
      const k = r.milestone_id as string;
      netByMilestone.set(k, round2((netByMilestone.get(k) || 0) + (Number(r.amount) || 0)));
    }
  }

  const cleared = new Set(["AVAILABLE", "WITHDRAWN"]);
  const wipStates = new Set(["FUNDED", "IN_REVIEW"]);

  let availableNet = 0; // cleared net
  let pendingNet = 0; // clearing net (PENDING)
  let workInProgress = 0; // gross of FUNDED/IN_REVIEW
  let lifetime = 0; // gross of approved (PENDING/AVAILABLE/WITHDRAWN)
  let lifetimeNet = 0; // net of approved
  const breakdown: EarningLine[] = [];

  for (const m of ms) {
    const status = (m.escrow_status as string) || "";
    const gross = Number(m.amount) || 0;
    const net = netByMilestone.get(m.id) ?? netFromGross(gross, plan);
    if (status === "PENDING") {
      pendingNet += net;
      lifetime += gross;
      lifetimeNet += net;
    } else if (cleared.has(status)) {
      availableNet += net;
      lifetime += gross;
      lifetimeNet += net;
      breakdown.push({
        id: m.id, jobId: m.job_id ?? null, gross,
        feeRate: feeRate(plan), fee: round2(gross - net), net,
        plan, date: m.approved_at ?? null,
      });
    } else if (wipStates.has(status)) {
      workInProgress += gross;
    }
  }

  // Balance already spent (Pro membership paid from balance).
  const { data: spentRows } = await supabase
    .from("membership_payments")
    .select("amount")
    .eq("user_id", userId)
    .eq("method", "balance")
    .eq("status", "paid");
  const balanceSpent = (spentRows ?? []).reduce(
    (t: number, r: { amount?: number | null }) => t + (Number(r.amount) || 0), 0
  );

  // Money already withdrawn (leaves the balance in full).
  const { data: wRows } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("user_id", userId)
    .neq("status", "failed");
  const withdrawn = (wRows ?? []).reduce(
    (t: number, r: { amount?: number | null }) => t + (Number(r.amount) || 0), 0
  );

  // Accepted refunds return money to the client, so they reduce the
  // freelancer's spendable balance (service-role read; refund_requests is
  // RLS-locked). Without this, a refunded freelancer could still withdraw the
  // returned funds.
  const { data: refundRows } = await admin
    .from("refund_requests")
    .select("amount, contracts!inner ( freelancer_id )")
    .eq("status", "accepted")
    .eq("contracts.freelancer_id", userId);
  const refunded = (refundRows ?? []).reduce(
    (t: number, r: { amount?: number | null }) => t + (Number(r.amount) || 0), 0
  );

  const available = Math.max(
    0,
    round2(availableNet - balanceSpent - withdrawn - refunded)
  );

  return {
    available,
    pending: round2(pendingNet + netFromGross(workInProgress, plan)),
    workInProgress: round2(workInProgress),
    lifetime: round2(lifetime),
    lifetimeNet: round2(lifetimeNet),
    balanceSpent: round2(balanceSpent),
    withdrawn: round2(withdrawn),
    feeRate: feeRate(plan),
    breakdown,
  };
}
