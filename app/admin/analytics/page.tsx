import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Analytics | Xwork Admin" };

const money = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const num = (v: unknown) => Number(v) || 0;

// Last N month buckets, oldest → newest, as { key: "YYYY-MM", label: "Jul" }.
function lastMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
      label: m.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return out;
}
const monthKey = (iso: string | null) =>
  iso ? iso.slice(0, 7) : ""; // ISO timestamps start "YYYY-MM"

export default async function AdminAnalyticsPage() {
  // Gate (redirects non-admins); platform-wide reads use the service role so
  // aggregates span every user's data, bypassing per-user RLS.
  await requireAdmin();
  const admin = createAdminClient();

  const [
    { data: profiles },
    { data: pays },
    { data: contracts },
    { data: jobs },
    { count: proposalCount },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("role, plan, id_verified, payment_verified, created_at, account_status"),
    admin
      .from("escrow_transactions")
      .select("type, amount, created_at"),
    admin.from("contracts").select("status, amount, created_at"),
    admin.from("jobs").select("status, created_at"),
    admin.from("proposals").select("*", { count: "exact", head: true }),
  ]);

  const P = profiles ?? [];
  const L = pays ?? []; // escrow ledger entries (source of truth for money)
  const C = contracts ?? [];
  const J = jobs ?? [];

  // ---- Money (from the append-only escrow ledger) ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sumType = (types: string[]) =>
    L.filter((e: any) => types.includes(e.type)).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: number, e: any) => s + num(e.amount),
      0
    );
  const gmv = sumType(["fund"]); // gross value funded into escrow
  const revenue = sumType(["fee_client", "fee_freelancer"]); // platform fees
  const netToFreelancers = sumType(["release"]); // released to freelancers
  const takeRate = gmv > 0 ? (revenue / gmv) * 100 : 0;

  // ---- People ----
  const freelancers = P.filter((p) => p.role === "freelancer").length;
  const clients = P.filter((p) => p.role === "client").length;
  const proMembers = P.filter((p) => p.plan === "pro").length;
  const verifiedId = P.filter((p) => p.id_verified).length;
  const paymentVerified = P.filter((p) => p.payment_verified).length;
  const suspended = P.filter(
    (p) =>
      p.account_status === "suspended" ||
      p.account_status === "permanently_suspended"
  ).length;

  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const newUsers30 = P.filter((p) => (p.created_at ?? "") >= days30).length;
  const newJobs30 = J.filter((j) => (j.created_at ?? "") >= days30).length;

  // ---- Marketplace activity ----
  const openJobs = J.filter(
    (j) => !j.status || j.status === "open"
  ).length;
  const activeContracts = C.filter((c) => c.status === "active").length;
  const completedContracts = C.filter((c) => c.status === "completed").length;
  const disputedContracts = C.filter((c) => c.status === "disputed").length;
  const contractValue = C.filter(
    (c) => c.status === "active" || c.status === "completed"
  ).reduce((s, c) => s + num(c.amount), 0);

  // ---- Monthly GMV + revenue (last 6 months) ----
  const months = lastMonths(6);
  const byMonth = new Map(
    months.map((m) => [m.key, { gmv: 0, revenue: 0 }])
  );
  for (const e of L) {
    const k = monthKey(e.created_at);
    const bucket = byMonth.get(k);
    if (!bucket) continue;
    if (e.type === "fund") bucket.gmv += num(e.amount);
    if (e.type === "fee_client" || e.type === "fee_freelancer")
      bucket.revenue += num(e.amount);
  }
  const series = months.map((m) => ({ ...m, ...byMonth.get(m.key)! }));
  const maxGmv = Math.max(1, ...series.map((s) => s.gmv));

  // Monthly signups (last 6 months) for a small sparkline.
  const signupByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const p of P) {
    const k = monthKey(p.created_at);
    if (signupByMonth.has(k))
      signupByMonth.set(k, (signupByMonth.get(k) ?? 0) + 1);
  }
  const signups = months.map((m) => ({
    ...m,
    count: signupByMonth.get(m.key) ?? 0,
  }));
  const maxSignups = Math.max(1, ...signups.map((s) => s.count));

  const headline: { label: string; value: string; sub?: string }[] = [
    { label: "GMV (all-time)", value: money(gmv), sub: "Gross value paid through escrow" },
    { label: "Platform revenue", value: money(revenue), sub: "Marketplace fees collected" },
    { label: "Take rate", value: `${takeRate.toFixed(1)}%`, sub: "Revenue ÷ GMV" },
    { label: "Paid to freelancers", value: money(netToFreelancers), sub: "Net of fees" },
  ];

  const activity: { label: string; value: number }[] = [
    { label: "Total users", value: P.length },
    { label: "New users (30d)", value: newUsers30 },
    { label: "Freelancers", value: freelancers },
    { label: "Clients", value: clients },
    { label: "Pro members", value: proMembers },
    { label: "ID verified", value: verifiedId },
    { label: "Payment verified", value: paymentVerified },
    { label: "Suspended", value: suspended },
    { label: "Jobs posted", value: J.length },
    { label: "Open jobs", value: openJobs },
    { label: "New jobs (30d)", value: newJobs30 },
    { label: "Proposals", value: proposalCount ?? 0 },
    { label: "Active contracts", value: activeContracts },
    { label: "Completed contracts", value: completedContracts },
    { label: "Open disputes", value: disputedContracts },
    { label: "Contract value", value: Math.round(contractValue) },
  ];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Marketplace health — revenue, growth, and activity across Xwork.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin"
              className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              🛡️ Trust &amp; Safety
            </Link>
            <Link
              href="/admin/support"
              className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              💬 Support
            </Link>
          </div>
        </div>

        {/* Headline money cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {headline.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {s.value}
              </p>
              {s.sub && (
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Monthly GMV / revenue chart */}
        <div className="rounded-2xl border border-border bg-card p-6 mt-8">
          <h2 className="text-lg font-bold text-foreground mb-1">
            Monthly GMV &amp; revenue
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Last 6 months. Purple = GMV, light = platform revenue.
          </p>
          <div className="flex items-end justify-between gap-3 h-48">
            {series.map((m) => {
              const gmvH = Math.round((m.gmv / maxGmv) * 160);
              const revH = Math.round((m.revenue / maxGmv) * 160);
              return (
                <div
                  key={m.key}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                >
                  <div className="flex items-end gap-1 h-40 w-full justify-center">
                    <div
                      className="w-1/3 rounded-t bg-primary"
                      style={{ height: `${gmvH}px` }}
                      title={`GMV ${money(m.gmv)}`}
                    />
                    <div
                      className="w-1/3 rounded-t bg-primary/30"
                      style={{ height: `${revH}px` }}
                      title={`Revenue ${money(m.revenue)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="text-[10px] text-foreground font-medium">
                    {money(m.gmv)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly signups */}
        <div className="rounded-2xl border border-border bg-card p-6 mt-6">
          <h2 className="text-lg font-bold text-foreground mb-1">
            New signups
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Last 6 months.</p>
          <div className="flex items-end justify-between gap-3 h-32">
            {signups.map((m) => (
              <div
                key={m.key}
                className="flex-1 flex flex-col items-center justify-end gap-1"
              >
                <span className="text-xs text-foreground font-medium">
                  {m.count}
                </span>
                <div
                  className="w-2/3 rounded-t bg-primary"
                  style={{
                    height: `${Math.round((m.count / maxSignups) * 90)}px`,
                  }}
                />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity grid */}
        <h2 className="text-xl font-bold text-foreground mt-10 mb-3">
          At a glance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activity.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-2xl font-bold text-foreground">
                {s.label === "Contract value"
                  ? money(s.value)
                  : s.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Money figures reflect completed milestone payments recorded in the
          escrow ledger. Payments are currently processed through the simulated
          gateway.
        </p>
      </div>
    </main>
  );
}
