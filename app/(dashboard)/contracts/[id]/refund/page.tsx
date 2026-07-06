import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import {
  requestRefund,
  respondRefund,
  cancelRefund,
} from "@/app/refunds/actions";

export const metadata = { title: "Refund | Xwork" };

// Refunds on a contract: either party can request one; the other party
// accepts or declines. Accepted refunds are returned to the client and
// deducted from the freelancer's balance automatically.

const ERRORS: Record<string, string> = {
  amount: "Enter a refund amount greater than $0.",
  reason: "Please describe the reason in at least 10 characters.",
  paid: "You can't refund more than has been paid on this contract.",
  pending: "There's already an open refund request on this contract.",
};

export default async function RefundPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, client_id, freelancer_id, status")
    .eq("id", id)
    .maybeSingle();
  if (
    !contract ||
    (contract.client_id !== user.id && contract.freelancer_id !== user.id)
  ) {
    redirect("/contracts");
  }
  const isClient = contract.client_id === user.id;

  // Total actually paid out on this contract (released milestones).
  const { data: ms } = await supabase
    .from("milestones")
    .select("amount, payment_status")
    .eq("contract_id", id)
    .eq("payment_status", "released");
  const paid = (ms ?? []).reduce((t, m) => t + (Number(m.amount) || 0), 0);

  const { data: reqRows } = await supabase
    .from("refund_requests")
    .select("id, requester_id, amount, reason, status, created_at, responded_at")
    .eq("contract_id", id)
    .order("created_at", { ascending: false });
  const requests = reqRows ?? [];
  const openRequest = requests.find((r) => r.status === "pending");

  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const statusChip = (s: string) =>
    s === "pending"
      ? "bg-amber-500/10 text-amber-600"
      : s === "accepted"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  const errorMsg = sp.error ? ERRORS[sp.error] : null;

  const input =
    "w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[760px] mx-auto">
        <Link
          href={`/contracts/${id}`}
          className="text-sm text-primary hover:underline"
        >
          ← Back to contract
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">Refunds</h1>
        <p className="text-muted-foreground mt-1">
          {contract.title} · {money(paid)} paid so far
        </p>

        {errorMsg && (
          <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            {errorMsg}
          </div>
        )}

        {/* New request */}
        {paid <= 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              Nothing has been paid on this contract yet, so there&apos;s
              nothing to refund. Once a milestone payment has been released,
              you can request a refund here.
            </p>
          </div>
        ) : openRequest ? (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
            There&apos;s an open refund request below — respond to it or wait
            for a response before starting another one.
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isClient ? "Request a refund" : "Offer a refund"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isClient
                ? "Ask the freelancer to return part or all of what you've paid. They'll review and respond."
                : "Return part or all of what the client paid. They'll confirm on their side."}
            </p>
            <form action={requestRefund.bind(null, id)} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Amount (USD) — up to {money(paid)}
                </label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  max={paid}
                  step="0.01"
                  required
                  placeholder="0.00"
                  className={input}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Reason
                </label>
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Explain what happened and why a refund is fair…"
                  className={input}
                />
              </div>
              <button
                type="submit"
                className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90"
              >
                Send refund request
              </button>
            </form>
          </div>
        )}

        {/* Request history */}
        {requests.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Refund requests
            </h2>
            {requests.map((r) => {
              const mine = r.requester_id === user.id;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-semibold text-foreground">
                      {money(Number(r.amount) || 0)}{" "}
                      <span className="font-normal text-muted-foreground">
                        · requested by {mine ? "you" : "the other party"} on{" "}
                        {fmt(r.created_at)}
                      </span>
                    </p>
                    <span
                      className={`text-xs rounded-full px-2.5 py-1 font-medium capitalize ${statusChip(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                    {r.reason}
                  </p>

                  {r.status === "pending" && !mine && (
                    <div className="flex items-center gap-3 mt-4">
                      <form action={respondRefund.bind(null, r.id, true)}>
                        <button className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90">
                          Accept refund
                        </button>
                      </form>
                      <form action={respondRefund.bind(null, r.id, false)}>
                        <button className="border border-border text-foreground rounded-full px-5 py-2 text-sm font-medium hover:bg-secondary">
                          Decline
                        </button>
                      </form>
                    </div>
                  )}
                  {r.status === "pending" && mine && (
                    <form action={cancelRefund.bind(null, r.id)} className="mt-4">
                      <button className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                        Cancel this request
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
