// Freelancer earnings — the single source of truth for balances.
//
// Released earnings come from the job_payments ledger (net-after-fee, recorded
// at the plan rate in effect when each milestone was released). "Available"
// balance is lifetime net minus anything already spent from balance (currently
// only Pro membership paid via balance). Pending = funded-but-unreleased
// milestones, netted at the freelancer's current plan rate.
//
// Plain module: callers pass in a Supabase client (RLS scopes rows to the user).

import { netFromGross, feeRate, type Plan } from "./fees";

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
  pending: number; // in escrow, not yet released
  lifetime: number; // gross released, before fees
  lifetimeNet: number; // net released, after fees
  balanceSpent: number; // paid out of balance (membership etc.)
  withdrawn: number; // already withdrawn to a payout method
  feeRate: number; // the freelancer's current fee rate
  breakdown: EarningLine[];
};

export async function getFreelancerEarnings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  plan: Plan
): Promise<Earnings> {
  // Released earnings ledger.
  const { data: payRows } = await supabase
    .from("job_payments")
    .select(
      "id, job_id, gross_amount, marketplace_fee_rate, marketplace_fee_amount, net_amount, plan_at_time_of_payment, payment_date"
    )
    .eq("freelancer_id", userId)
    .order("payment_date", { ascending: false });

  const rows = payRows ?? [];
  const lifetime = rows.reduce(
    (t: number, r: { gross_amount?: number | null }) => t + (Number(r.gross_amount) || 0),
    0
  );
  const lifetimeNet = rows.reduce(
    (t: number, r: { net_amount?: number | null }) => t + (Number(r.net_amount) || 0),
    0
  );

  // Funded-but-unreleased milestones = pending (netted at current plan rate).
  const { data: ms } = await supabase
    .from("milestones")
    .select("amount, payment_status, contracts!inner ( freelancer_id )")
    .eq("contracts.freelancer_id", userId);
  const pendingGross = (ms ?? [])
    .filter(
      // "returned" = escrow refunded to the client when a contract ended early.
      (m: { payment_status?: string | null }) =>
        m.payment_status !== "released" && m.payment_status !== "returned"
    )
    .reduce(
      (t: number, m: { amount?: number | null }) => t + (Number(m.amount) || 0),
      0
    );
  const pending = netFromGross(pendingGross, plan);

  // Amount already spent from balance (Pro membership paid via balance).
  const { data: spentRows } = await supabase
    .from("membership_payments")
    .select("amount")
    .eq("user_id", userId)
    .eq("method", "balance")
    .eq("status", "paid");
  const balanceSpent = (spentRows ?? []).reduce(
    (t: number, r: { amount?: number | null }) => t + (Number(r.amount) || 0),
    0
  );

  // Money already withdrawn to a payout method (the amount leaves the
  // balance in full — the provider fee is taken out of it).
  const { data: wRows } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("user_id", userId)
    .neq("status", "failed");
  const withdrawn = (wRows ?? []).reduce(
    (t: number, r: { amount?: number | null }) => t + (Number(r.amount) || 0),
    0
  );

  const available = Math.max(
    0,
    round2(lifetimeNet - balanceSpent - withdrawn)
  );

  const breakdown: EarningLine[] = rows.map(
    (r: {
      id: string;
      job_id: string | null;
      gross_amount?: number | null;
      marketplace_fee_rate?: number | null;
      marketplace_fee_amount?: number | null;
      net_amount?: number | null;
      plan_at_time_of_payment?: string | null;
      payment_date?: string | null;
    }) => ({
      id: r.id,
      jobId: r.job_id,
      gross: Number(r.gross_amount) || 0,
      feeRate: Number(r.marketplace_fee_rate) || 0,
      fee: Number(r.marketplace_fee_amount) || 0,
      net: Number(r.net_amount) || 0,
      plan: r.plan_at_time_of_payment ?? "basic",
      date: r.payment_date ?? null,
    })
  );

  return {
    available,
    pending: round2(pending),
    lifetime: round2(lifetime),
    lifetimeNet: round2(lifetimeNet),
    balanceSpent: round2(balanceSpent),
    withdrawn: round2(withdrawn),
    feeRate: feeRate(plan),
    breakdown,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
