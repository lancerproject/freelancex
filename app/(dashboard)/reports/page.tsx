import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";

export default async function ReportsPage() {
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
  const released = earnings.breakdown;

  // Group net earnings by month (net-after-fee, from the ledger).
  const byMonth = new Map<string, number>();
  for (const b of released) {
    const d = new Date(b.date || Date.now());
    const key = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    byMonth.set(key, (byMonth.get(key) || 0) + b.net);
  }
  const rows = Array.from(byMonth.entries());
  const total = rows.reduce((t, [, v]) => t + v, 0);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  // Refund rows carry a negative gross; count only actual payments.
  const paymentCount = released.filter((b) => b.gross > 0).length;

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <h1 className="text-3xl font-bold text-foreground">Your reports</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Your earnings over time (net, after the marketplace fee).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-[1100px] mb-8">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total earnings</p>
          <p className="text-3xl font-bold text-foreground mt-1">{money(total)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Payments</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {paymentCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Active months</p>
          <p className="text-3xl font-bold text-foreground mt-1">{rows.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 max-w-[1100px]">
        <h2 className="font-semibold text-foreground mb-4">Earnings by month</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            No earnings yet. Approved milestone payments will appear here.{" "}
            <Link href="/finances" className="text-primary hover:underline">
              Go to finances
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map(([month, v]) => (
              <div key={month} className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground shrink-0">
                  {month}
                </span>
                <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.max(0, (v / max) * 100)}%` }}
                  />
                </div>
                <span className="w-24 text-right text-sm font-medium text-foreground">
                  {money(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
