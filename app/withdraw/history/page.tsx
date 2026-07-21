import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const metadata = { title: "Withdrawal history | Xwork" };

// Full list of every withdrawal the freelancer has made. Linked from the
// "Recent withdrawals" card on /withdraw (which shows only the latest few).
export default async function WithdrawalHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("withdrawals")
    .select("id, method_label, amount, fee, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const withdrawals = rows ?? [];

  const totalOut = withdrawals.reduce(
    (s, w) => s + (Number(w.amount) || 0),
    0
  );

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
        <Link
          href="/withdraw"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Withdrawals
        </Link>
        <div className="flex items-baseline justify-between mt-3 mb-8 flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Withdrawal history
          </h1>
          {withdrawals.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {withdrawals.length} withdrawal
              {withdrawals.length === 1 ? "" : "s"} · {money(totalOut)} total
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground">
              You haven&apos;t made any withdrawals yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Method</th>
                    <th className="text-right font-medium px-4 py-3">Amount</th>
                    <th className="text-right font-medium px-4 py-3">Fee</th>
                    <th className="text-right font-medium px-4 py-3">Received</th>
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
                        {money((Number(w.amount) || 0) - (Number(w.fee) || 0))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                            w.status === "completed"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {w.status === "completed"
                            ? "Completed"
                            : "Processing"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
