import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";
import { feePercent, netFromGross } from "@/lib/fees";
import { ProLockedCard } from "@/components/pro-locked-card";

// A summary card with an optional "?" tooltip explaining the bucket.
function Stat({
  label,
  value,
  tip,
  sub,
}: {
  label: string;
  value: string;
  tip?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        {label}
        {tip && (
          <span
            title={tip}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-neutral-300 text-[10px] text-muted-foreground cursor-help"
          >
            ?
          </span>
        )}
      </p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default async function FinancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const membership = getMembership(profile);

  // Milestones across this freelancer's contracts (inner join filters by them).
  const { data: ms } = await supabase
    .from("milestones")
    .select("*, contracts!inner ( id, freelancer_id, title, job_id )")
    .eq("contracts.freelancer_id", user.id);
  const milestones = ms ?? [];

  const sum = (arr: { amount?: number | null }[]) =>
    arr.reduce((t, m) => t + (Number(m.amount) || 0), 0);
  const net = (gross: number) => netFromGross(gross, membership.plan);

  // Pre-release pipeline buckets (netted at the freelancer's current rate).
  const workInProgress = milestones.filter(
    (m) => m.status === "pending" && m.payment_status !== "released"
  );
  const inReview = milestones.filter((m) => m.status === "submitted");
  const pendingHold = milestones.filter(
    (m) => m.status === "approved" && m.payment_status !== "released"
  );
  const wipAmt = net(sum(workInProgress));
  const reviewAmt = net(sum(inReview));
  const pendingAmt = net(sum(pendingHold));

  // Released earnings + available balance come from the ledger (authoritative).
  const earnings = await getFreelancerEarnings(supabase, user.id, membership.plan);

  const jobIds = Array.from(
    new Set(earnings.breakdown.map((b) => b.jobId).filter(Boolean))
  ) as string[];
  const titleById = new Map<string, string>();
  if (jobIds.length) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title")
      .in("id", jobIds);
    for (const j of jobs ?? []) titleById.set(j.id as string, j.title as string);
  }

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <h1 className="text-3xl font-bold text-foreground mb-2">Overview</h1>
      <p className="text-muted-foreground mb-6">
        Your earnings, transactions, and withdrawals.
      </p>

      {/* Summary cards — fixed-price pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Work in progress"
          value={money(wipAmt)}
          tip="Funds for fixed-price milestones you've accepted and are working on now. When you submit the work it moves to In review. If the client asks for changes, it stays here."
        />
        <Stat
          label="In review"
          value={money(reviewAmt)}
          tip="Work you've submitted that the client is reviewing. Clients have 5 days to approve or request changes. If they approve — or don't respond within 5 days — it moves to Pending. If they request changes, it goes back to Work in progress."
        />
        <Stat
          label="Pending"
          value={money(pendingAmt)}
          tip="Approved funds in a 3-day security hold, during which they can't be withdrawn yet. After the hold they become available to withdraw anytime."
        />
        <Stat
          label="Available balance"
          value={money(earnings.available)}
          sub="Ready to withdraw"
        />
      </div>

      {/* Transactions — the itemized earnings breakdown is a Pro feature. */}
      <h2 id="transactions" className="text-xl font-bold text-foreground mb-4">
        Transactions
      </h2>
      {!membership.isPro ? (
        <ProLockedCard
          title="Earnings breakdown is a Pro feature"
          body={`Upgrade to Pro to see every payment itemized with its fee and net amount — and pay just ${feePercent(
            "pro"
          )}% instead of ${feePercent("basic")}%.`}
        />
      ) : earnings.breakdown.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No transactions yet. Released milestone payments will appear here.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-5 py-3">Job</th>
                  <th className="text-right font-medium px-5 py-3">Amount</th>
                  <th className="text-right font-medium px-5 py-3">Fee</th>
                  <th className="text-right font-medium px-5 py-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {earnings.breakdown.map((b) => (
                  <tr key={b.id}>
                    <td className="px-5 py-3 text-muted-foreground">
                      {fmtDate(b.date)}
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      {(b.jobId && titleById.get(b.jobId)) || "Fixed-price payment"}
                    </td>
                    <td className="px-5 py-3 text-right text-foreground">
                      {money(b.gross)}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      −{money(b.fee)} ({Math.round((b.feeRate || 0) * 100)}%)
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">
                      {money(b.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-8">
        Looking for your contracts?{" "}
        <Link href="/contracts" className="text-primary hover:underline">
          View contracts
        </Link>
      </p>
    </main>
  );
}
