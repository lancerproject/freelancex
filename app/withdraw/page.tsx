import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { identityBlocked } from "@/lib/identity";
import { redirect } from "next/navigation";
import { WithdrawalMethods } from "@/components/withdrawal-methods";
import { WithdrawNow } from "@/components/withdraw-now";
import { taxInfoComplete } from "@/lib/tax";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";

export const metadata = { title: "Withdrawals | Xwork" };

export default async function WithdrawalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const verifyRequired = await identityBlocked();

  // Tax information (W-9 / W-8BEN) must be completed before withdrawing.
  const { data: meProfile } = await supabase
    .from("profiles")
    .select(
      "tax_info, country, plan, membership_status, membership_end_date, membership_autorenew"
    )
    .eq("id", user.id)
    .maybeSingle();
  const taxComplete = taxInfoComplete(meProfile?.tax_info);
  const membership = getMembership(meProfile);

  const { data: payoutMethods } = await supabase
    .from("payout_methods")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  const methods = payoutMethods ?? [];

  // Withdrawal history (newest first).
  const { data: withdrawalRows } = await supabase
    .from("withdrawals")
    .select("id, method_label, amount, fee, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(15);
  const withdrawals = withdrawalRows ?? [];

  // Balance comes from the job_payments ledger (net-after-fee, minus anything
  // already spent from balance). Plan-aware: Pro nets 95%, Basic 90%.
  const earnings = await getFreelancerEarnings(
    supabase,
    user.id,
    membership.plan
  );
  const netAvailable = earnings.available;
  const pending = earnings.pending;
  const lifetime = earnings.lifetime; // gross, before fees
  const paymentCount = earnings.breakdown.length;

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Withdrawals</h1>

        {/* Tax information is required before any withdrawal. */}
        {!taxComplete && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-semibold text-foreground">
              Complete your tax information to withdraw
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Before you can withdraw funds, we&apos;re required to collect your
              tax details — Form W-9 for U.S. persons, or a W-8BEN for everyone
              else. It only takes a minute.
            </p>
            <Link
              href="/settings/tax"
              className="inline-block mt-3 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90"
            >
              Complete tax information
            </Link>
          </div>
        )}

        {/* Available balance */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-semibold text-foreground">
              Available balance
            </h2>
            <span className="text-muted-foreground text-xl">$</span>
          </div>
          <p className="text-3xl font-bold text-primary mt-3">
            {money(netAvailable)}
          </p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            +{money(pending)} pending
            <span
              title="Pending earnings come from work that's been approved but is still clearing. They move to your available balance once cleared."
              className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-neutral-300 text-[10px] text-muted-foreground cursor-help"
            >
              ?
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Lifetime earnings: {money(lifetime)} · {paymentCount} payment
            {paymentCount === 1 ? "" : "s"} (before fees)
          </p>

          <div className="flex items-center gap-5 mt-6">
            {verifyRequired ? (
              <Link
                href="/settings/identity?from=withdraw"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
              >
                Verify to withdraw
              </Link>
            ) : !taxComplete ? (
              <Link
                href="/settings/tax"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
              >
                Complete tax info to withdraw
              </Link>
            ) : (
              <WithdrawNow available={netAvailable} methods={methods} />
            )}
            <Link
              href="/transactions"
              className="text-sm font-medium text-foreground underline hover:no-underline"
            >
              View my earnings
            </Link>
          </div>
        </div>

        {/* Recent withdrawals */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Recent withdrawals
          </h2>
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground mt-3">
              You haven&apos;t made any withdrawals yet.
            </p>
          ) : (
            <div className="overflow-x-auto mt-4 rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Method</th>
                    <th className="text-right font-medium px-4 py-3">Amount</th>
                    <th className="text-right font-medium px-4 py-3">Fee</th>
                    <th className="text-right font-medium px-4 py-3">
                      Received
                    </th>
                    <th className="text-right font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {fmt(w.created_at)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {w.method_label}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {money(Number(w.amount) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        -{money(Number(w.fee) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {money(
                          (Number(w.amount) || 0) - (Number(w.fee) || 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                            w.status === "completed"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {w.status === "completed" ? "Completed" : "Processing"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Withdrawal methods */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <WithdrawalMethods
            methods={methods}
            country={meProfile?.country ?? null}
            verifyRequired={verifyRequired}
          />
        </div>
      </div>
    </main>
  );
}
