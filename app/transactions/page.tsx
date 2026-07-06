import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TransactionsTable } from "@/components/transactions-table";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";
import { feePercent } from "@/lib/fees";
import { ProLockedCard } from "@/components/pro-locked-card";

export const metadata = { title: "Transactions | Xwork" };

export default async function TransactionsPage() {
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

  const earnings = await getFreelancerEarnings(supabase, user.id, membership.plan);
  const available = earnings.available;
  const pending = earnings.pending;
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  // Job titles for the ledger rows (job_payments only stores job_id).
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

  // Build transaction rows from the earnings ledger: a payment (+gross) and the
  // matching marketplace fee (−rate recorded at release time).
  const txns: {
    id: string;
    date: string;
    type: "earning" | "fee" | "withdrawal" | "refund";
    desc: string;
    amount: number;
  }[] = [];
  for (const b of earnings.breakdown) {
    const title = (b.jobId && titleById.get(b.jobId)) || "Fixed-price payment";
    // A negative ledger row is a refund returned to the client — show it as
    // one clearly-labelled line, not a "payment" with a $0 fee.
    if (b.gross < 0) {
      txns.push({
        id: `${b.id}-refund`,
        date: b.date || "",
        type: "refund",
        desc: `Refund to client — ${title}`,
        amount: b.gross,
      });
      continue;
    }
    txns.push({
      id: `${b.id}-pay`,
      date: b.date || "",
      type: "earning",
      desc: `Fixed-price payment — ${title}`,
      amount: b.gross,
    });
    txns.push({
      id: `${b.id}-fee`,
      date: b.date || "",
      type: "fee",
      desc: `Xwork marketplace fee (${Math.round((b.feeRate || 0) * 100)}%)`,
      amount: -b.fee,
    });
  }

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Transactions</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-foreground">Pending earnings</p>
              <span
                title="Approved funds in the 3-day security hold — not available to withdraw yet."
                className="text-muted-foreground cursor-help"
              >
                ⏳
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {money(pending)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-foreground">Available balance</p>
              <span className="text-muted-foreground text-lg">$</span>
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">
              {money(available)}
            </p>
            {available > 0 ? (
              <Link
                href="/withdraw"
                className="inline-block mt-3 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90"
              >
                Withdrawals
              </Link>
            ) : (
              <span
                title="No funds available to withdraw yet"
                className="inline-block mt-3 bg-neutral-200 text-neutral-400 px-5 py-2 rounded-full text-sm font-semibold cursor-not-allowed"
              >
                Withdrawals
              </span>
            )}
          </div>
        </div>

        {/* Detailed earnings breakdown is a Pro feature. Basic users still see
            their balance above, but not the itemized fee-by-fee ledger. */}
        {membership.isPro ? (
          <TransactionsTable txns={txns} />
        ) : (
          <ProLockedCard
            title="Earnings breakdown is a Pro feature"
            body={`Upgrade to Pro to see every payment itemized with the exact marketplace fee (Pro pays just ${feePercent(
              "pro"
            )}% vs ${feePercent("basic")}%) and net amount.`}
          />
        )}
      </div>
    </main>
  );
}
