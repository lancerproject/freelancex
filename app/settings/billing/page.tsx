import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { BillingMethods } from "@/components/billing-methods";
import { loadOwnProfile } from "@/lib/own-profile";

const CLIENT_FEE = 0.02; // 2%

export const metadata = { title: "Billing & Payments | Xwork" };

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadOwnProfile(user.id);
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

  const hasBillingMethod = !!profile?.card_last4 || !!profile?.paypal_email;
  const cardLabel = profile?.card_last4
    ? `${(profile.card_brand ?? "Card").replace(/^\w/, (c: string) => c.toUpperCase())} •••• ${profile.card_last4}`
    : profile?.paypal_email
      ? `PayPal — ${profile.paypal_email}`
      : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Billing &amp; payments</h2>

      {/* Top row: Outstanding balance + Company billing cycle (like Upwork) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <h3 className="text-xl font-bold text-foreground">Outstanding balance</h3>
          <p className="text-3xl font-bold text-foreground mt-3">{money(0)}</p>
          <button
            type="button"
            disabled
            title="Nothing to pay — you fund milestones directly from a contract"
            className="mt-5 rounded-full bg-secondary text-muted-foreground px-6 py-2.5 text-sm font-semibold cursor-not-allowed"
          >
            Pay now
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <h3 className="text-xl font-bold text-foreground">Company billing cycle</h3>
          <p className="text-foreground mt-3">Weekly</p>
          <p className="text-sm text-muted-foreground mt-8">
            Terms: <span className="font-semibold text-foreground">Standard</span>
          </p>
        </div>
      </div>

      {/* Billing methods (Upwork-style card) */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <h3 className="text-xl font-bold text-foreground">Billing methods</h3>
        {hasBillingMethod ? (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border p-5">
            <p className="text-foreground font-medium">{cardLabel}</p>
            <span className="text-xs text-muted-foreground">Default</span>
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 max-w-xl">
            You haven&apos;t set up any billing methods yet. Add a method so you
            can hire when you&apos;re ready.
          </p>
        )}
        <button
          type="button"
          disabled
          title="Card payments become available when payments go live"
          className="mt-6 inline-flex items-center gap-2 text-muted-foreground text-sm font-semibold cursor-not-allowed"
        >
          <span className="text-lg leading-none">+</span> Add a billing method
        </button>
        <p className="text-muted-foreground text-xs mt-4 max-w-xl">
          It&apos;s free to post jobs and hire — you only pay when you fund a
          milestone. Card payments become available when payments go live.
        </p>
      </div>

      {/* Billing history (kept — richer than Upwork's, useful for clients) */}
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
