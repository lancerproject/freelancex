import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { getFreelancerEarnings } from "@/lib/earnings";
import { feePercent, netFromGross, feeRate } from "@/lib/fees";
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
    .select(
      "*, contracts!inner ( id, freelancer_id, client_id, title, job_id )"
    )
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

  // ---- Lifecycle transaction ledger --------------------------------------
  // Every funded milestone appears here and moves through its escrow states:
  //   In progress → In review → Pending (fee is cut here, so a second "Fee"
  //   line appears) → Paid. Each row shows the client + job title (clickable
  //   into the contract room) and the full project amount; the fee is a
  //   separate signed line so the deduction is explicit.
  const clientIds = Array.from(
    new Set(
      milestones
        .map((m: { contracts?: { client_id?: string } }) => m.contracts?.client_id)
        .filter(Boolean)
    )
  ) as string[];
  const clientNameById = new Map<string, string>();
  if (clientIds.length) {
    const { data: cps } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", clientIds);
    for (const c of cps ?? [])
      clientNameById.set(
        c.id as string,
        (c.full_name as string) || (c.username as string) || "Client"
      );
  }

  const rate = feeRate(membership.plan);
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  type LedgerRow = {
    key: string;
    date: string | null;
    sub: number; // keeps a milestone's fee line right under its amount line
    status: "In progress" | "In review" | "Pending" | "Paid" | "Fee";
    contractId: string;
    job: string;
    client: string;
    amount: number; // signed: earnings positive, fee negative
    note?: string;
  };
  const ACTIVE = new Set([
    "FUNDED",
    "IN_REVIEW",
    "PENDING",
    "AVAILABLE",
    "WITHDRAWN",
  ]);
  const rows: LedgerRow[] = [];
  for (const m of milestones) {
    const es = (m.escrow_status as string) || "";
    if (!ACTIVE.has(es)) continue;
    const gross = Number(m.amount) || 0;
    const c = m.contracts || {};
    const contractId = c.id as string;
    const job = (c.title as string) || (m.title as string) || "Contract";
    const client = clientNameById.get(c.client_id as string) || "Client";

    let status: LedgerRow["status"];
    let date: string | null;
    if (es === "FUNDED") {
      status = "In progress";
      date = m.created_at ?? null;
    } else if (es === "IN_REVIEW") {
      status = "In review";
      date = m.submitted_at ?? m.created_at ?? null;
    } else if (es === "PENDING") {
      status = "Pending";
      date = m.approved_at ?? m.created_at ?? null;
    } else {
      status = "Paid";
      date = m.approved_at ?? m.created_at ?? null;
    }

    rows.push({
      key: `${m.id}-amt`,
      date,
      sub: 0,
      status,
      contractId,
      job,
      client,
      amount: gross,
    });
    // The service fee is cut when work is approved (PENDING) — from that point
    // on, show the deduction as its own line.
    if (es === "PENDING" || es === "AVAILABLE" || es === "WITHDRAWN") {
      rows.push({
        key: `${m.id}-fee`,
        date,
        sub: 1,
        status: "Fee",
        contractId,
        job,
        client,
        amount: -round2(gross * rate),
        note: `${Math.round(rate * 100)}% marketplace fee`,
      });
    }
  }
  const dateMs = (d: string | null) => (d ? new Date(d).getTime() : 0);
  rows.sort((a, b) => dateMs(b.date) - dateMs(a.date) || a.sub - b.sub);

  const STATUS_PILL: Record<LedgerRow["status"], string> = {
    "In progress": "bg-blue-500/10 text-blue-600",
    "In review": "bg-amber-500/10 text-amber-600",
    Pending: "bg-orange-500/10 text-orange-600",
    Paid: "bg-primary/10 text-primary",
    Fee: "bg-secondary text-muted-foreground",
  };

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
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No transactions yet. Once a client funds a milestone, it appears here
          and moves from In progress → In review → Pending → Paid.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3">
                    Client &amp; job
                  </th>
                  <th className="text-right font-medium px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {fmtDate(r.date)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.status === "Fee" ? (
                        <span className="text-muted-foreground">{r.note}</span>
                      ) : (
                        <>
                          <Link
                            href={`/contracts/${r.contractId}`}
                            className="text-foreground font-medium hover:text-primary hover:underline"
                          >
                            {r.job}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {r.client}
                          </span>
                        </>
                      )}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-medium whitespace-nowrap ${
                        r.amount < 0 ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {r.amount < 0 ? `−${money(-r.amount)}` : money(r.amount)}
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
