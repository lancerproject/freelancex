import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { BillingMethods } from "@/components/billing-methods";

const CLIENT_FEE = 0.02; // 2%

export const metadata = { title: "Billing & Payments | Xwork" };

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, card_brand, card_last4, paypal_email")
    .eq("id", user.id)
    .maybeSingle();
  const isClient = profile?.role === "client";

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const fmtDate = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

  /* ============================ FREELANCER ============================ */
  // Freelancers are never billed — posting proposals and applying are free,
  // and the service fee is deducted from earnings, not charged to a card.
  if (!isClient) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Billing &amp; Payments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Payment methods for your{" "}
            <Link href="/settings/membership" className="text-primary hover:underline">
              Pro membership
            </Link>
            . Applying for work is always free — your marketplace fee is taken
            from earnings, never charged here.
          </p>
        </div>

        <BillingMethods
          hasCard={!!profile?.card_last4}
          cardLabel={
            profile?.card_last4
              ? `${(profile.card_brand ?? "Card").replace(/^\w/, (c: string) =>
                  c.toUpperCase()
                )} •••• ${profile.card_last4}`
              : null
          }
          hasPaypal={!!profile?.paypal_email}
          paypalEmail={profile?.paypal_email ?? null}
          stripeReady={!!process.env.STRIPE_SECRET_KEY}
          paypalReady={!!process.env.PAYPAL_CLIENT_ID}
        />

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Getting paid</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Manage how you receive money and review what you&apos;ve earned.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/withdraw"
              className="border border-border rounded-full px-4 py-2 font-medium text-foreground hover:bg-secondary"
            >
              Withdrawals &amp; payout methods
            </Link>
            <Link
              href="/transactions"
              className="border border-border rounded-full px-4 py-2 font-medium text-foreground hover:bg-secondary"
            >
              Transaction history
            </Link>
            <Link
              href="/settings/tax"
              className="border border-border rounded-full px-4 py-2 font-medium text-foreground hover:bg-secondary"
            >
              Tax information
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ============================== CLIENT ============================== */
  const { data: ms } = await supabase
    .from("milestones")
    .select("*, contracts!inner ( client_id, title )")
    .eq("contracts.client_id", user.id);
  const milestones = ms ?? [];
  const released = milestones.filter((m) => m.payment_status === "released");
  const inEscrow = milestones.filter((m) => m.payment_status === "funded");

  const sum = (arr: { amount?: number | null }[]) =>
    arr.reduce((t, m) => t + (Number(m.amount) || 0), 0);
  const spentBase = sum(released);
  const spentFee = spentBase * CLIENT_FEE;
  const totalSpent = spentBase + spentFee;
  const escrow = sum(inEscrow);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Billing &amp; Payments</h2>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm text-muted-foreground">Total spent</h3>
          <p className="text-3xl font-bold text-foreground mt-2">
            {money(totalSpent)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Incl. 2% service fee</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm text-muted-foreground">In escrow</h3>
          <p className="text-3xl font-bold text-foreground mt-2">{money(escrow)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Funded, awaiting approval
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm text-muted-foreground">Service fee</h3>
          <p className="text-3xl font-bold text-foreground mt-2">2%</p>
          <p className="text-xs text-muted-foreground mt-1">No hidden charges</p>
        </div>
      </div>

      {/* Billing methods */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">
          Manage billing methods
        </h3>
        <p className="text-muted-foreground mt-1">
          Add, update, or remove the cards you use to pay for work.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-border p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              No billing method added yet
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              You only pay when you fund a milestone. It&apos;s free to post jobs
              and hire.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Adding a card becomes available when payments go live"
            className="border border-border text-muted-foreground rounded-full px-4 py-2 text-sm cursor-not-allowed shrink-0"
          >
            + Add a billing method
          </button>
        </div>

        <p className="text-muted-foreground text-sm mt-4">
          Card payments become available when payments go live. Your spending
          above is tracked from funded and released milestones.
        </p>
      </div>

      {/* Billing history */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Billing history
        </h3>
        {released.length === 0 ? (
          <p className="text-muted-foreground">
            No payments yet. Approved milestone payments will appear here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Milestone</th>
                  <th className="text-right font-medium px-4 py-3">Amount</th>
                  <th className="text-right font-medium px-4 py-3">Fee (2%)</th>
                  <th className="text-right font-medium px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {released.map((m) => {
                  const base = Number(m.amount) || 0;
                  const f = base * CLIENT_FEE;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate(m.approved_at || m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {m.title || "Milestone"}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {money(base)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {money(f)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {money(base + f)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
