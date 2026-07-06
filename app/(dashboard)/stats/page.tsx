import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { refreshTalentStats } from "@/lib/stats-refresh";
import { talentBadgeMeta, JSS_UPDATE_DAYS } from "@/lib/talent-badges";
import { ProfileViewsChart } from "@/components/profile-views-chart";

export const metadata = { title: "My stats | Xwork" };

const PROPOSAL_RANGES = [7, 30, 90] as const;
const VIEW_RANGES = [7, 30] as const;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; v?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pRange = PROPOSAL_RANGES.includes(Number(sp.p) as 7 | 30 | 90)
    ? Number(sp.p)
    : 7;
  const vRange = VIEW_RANGES.includes(Number(sp.v) as 7 | 30) ? Number(sp.v) : 7;

  // Live talent stats — refreshes the JSS snapshot / badge when the 15-day
  // cycle is due, otherwise returns the stored values.
  const talent = await refreshTalentStats(user.id);
  if (!talent) redirect("/dashboard"); // clients don't have freelancer stats

  // ---- 12-month earnings (net, from the payments ledger) -------------------
  const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
  const { data: payRows } = await supabase
    .from("job_payments")
    .select("net_amount")
    .eq("freelancer_id", user.id)
    .gte("payment_date", yearAgo);
  const earned12 = (payRows ?? []).reduce(
    (t, r) => t + (Number(r.net_amount) || 0),
    0
  );

  // ---- Proposal funnel for the selected period ------------------------------
  const pStart = new Date(Date.now() - pRange * 86400000).toISOString();
  const { data: props } = await supabase
    .from("proposals")
    .select("status, viewed_at, created_at")
    .eq("freelancer_id", user.id)
    .gte("created_at", pStart);
  const plist = (props ?? []).filter((p) => p.status !== "withdrawn");
  const sent = plist.length;
  const viewed = plist.filter((p) => !!p.viewed_at).length;
  const interviews = plist.filter(
    (p) => p.status === "shortlisted" || p.status === "messaged"
  ).length;
  const hires = plist.filter((p) => p.status === "accepted").length;

  // ---- Profile views (daily) -------------------------------------------------
  const vStart = new Date();
  vStart.setHours(0, 0, 0, 0);
  vStart.setDate(vStart.getDate() - (vRange - 1));
  const { data: viewRows } = await supabase
    .from("profile_view_events")
    .select("created_at")
    .eq("profile_id", user.id)
    .gte("created_at", vStart.toISOString());
  const dayCounts: { label: string; count: number }[] = [];
  for (let i = 0; i < vRange; i++) {
    const d = new Date(vStart);
    d.setDate(vStart.getDate() + i);
    const label = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const dayStart = new Date(d);
    const dayEnd = new Date(d);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = (viewRows ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    dayCounts.push({ label, count });
  }

  // ---- Client relationships (>90 days vs newer) ------------------------------
  const { data: contracts } = await supabase
    .from("contracts")
    .select("client_id, created_at")
    .eq("freelancer_id", user.id);
  const firstPerClient: Record<string, string> = {};
  for (const c of contracts ?? []) {
    if (!c.client_id || !c.created_at) continue;
    if (!firstPerClient[c.client_id] || c.created_at < firstPerClient[c.client_id])
      firstPerClient[c.client_id] = c.created_at;
  }
  const ninetyAgoMs = Date.now() - 90 * 86400000;
  const clients = Object.values(firstPerClient);
  const longTerm = clients.filter(
    (d) => new Date(d).getTime() < ninetyAgoMs
  ).length;
  const shortTerm = clients.length - longTerm;

  // ---- Presentation helpers ---------------------------------------------------
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";
  const pct = (n: number, of: number) =>
    of > 0 ? Math.max(4, Math.round((n / of) * 100)) : 0;

  const jss = talent.jssScore;
  const badgeMeta = talentBadgeMeta(talent.badge);

  // SVG ring geometry (JSS + relationships donut share it).
  const R = 42;
  const CIRC = 2 * Math.PI * R;

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px]">
        <h1 className="text-3xl font-bold text-foreground">My stats</h1>
        <p className="text-muted-foreground mt-1">
          View proposal history, earnings, profile analytics, and your Job
          Success Score.
        </p>
        <p className="text-xs text-muted-foreground mt-1 mb-6">
          Stats update in real time. Your Job Success Score refreshes every{" "}
          {JSS_UPDATE_DAYS} days
          {talent.nextJssUpdate
            ? ` — next update ${fmtDate(talent.nextJssUpdate)}`
            : ""}
          .
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ---------------- LEFT column ---------------- */}
          <div className="space-y-6">
            {/* 12-month earnings */}
            <Card>
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  12-month earnings
                </h2>
                <span className="text-2xl font-bold text-foreground">
                  {money(earned12)}
                </span>
              </div>
              <Link
                href="/transactions"
                className="text-primary hover:underline text-sm mt-3 inline-block font-medium"
              >
                Transaction history
              </Link>
            </Card>

            {/* Job Success Score */}
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Job Success Score
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                    {jss != null
                      ? "Your score reflects client satisfaction, completed work and repeat relationships."
                      : "Use Job Success insights to learn how to earn a score."}
                  </p>
                  <Link
                    href="/job-success"
                    className="inline-block mt-4 border border-border rounded-full px-5 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    View insights
                  </Link>
                </div>
                <div className="text-center shrink-0">
                  <svg width="104" height="104" viewBox="0 0 104 104">
                    <circle
                      cx="52"
                      cy="52"
                      r={R}
                      fill="none"
                      strokeWidth="8"
                      className="stroke-secondary"
                    />
                    {jss != null && (
                      <circle
                        cx="52"
                        cy="52"
                        r={R}
                        fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(jss / 100) * CIRC} ${CIRC}`}
                        transform="rotate(-90 52 52)"
                        className="stroke-primary"
                      />
                    )}
                    <text
                      x="52"
                      y="58"
                      textAnchor="middle"
                      className="fill-foreground"
                      fontSize="22"
                      fontWeight="700"
                    >
                      {jss != null ? `${jss}%` : "–"}
                    </text>
                  </svg>
                  <p className="text-sm text-muted-foreground mt-1">
                    {jss != null ? "Job Success" : "No score yet"}
                  </p>
                </div>
              </div>
              {jss == null && talent.jssNeeded.length > 0 && (
                <ul className="mt-4 border-t border-border pt-3 space-y-1 text-sm text-muted-foreground">
                  {talent.jssNeeded.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Profile metrics */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Profile views
                </h2>
                <RangePills
                  current={vRange}
                  options={[...VIEW_RANGES]}
                  build={(n) => `/stats?p=${pRange}&v=${n}`}
                />
              </div>
              <ProfileViewsChart days={dayCounts} />
              <div className="mt-3 text-right">
                <Link
                  href="/profile"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  My profile
                </Link>
              </div>
            </Card>
          </div>

          {/* ---------------- RIGHT column ---------------- */}
          <div className="space-y-6">
            {/* Proposals */}
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Proposals
                </h2>
                <RangePills
                  current={pRange}
                  options={[...PROPOSAL_RANGES]}
                  build={(n) => `/stats?p=${n}&v=${vRange}`}
                />
              </div>
              <p className="text-2xl font-bold text-foreground mt-3">
                {sent} proposal{sent === 1 ? "" : "s"} sent
              </p>

              <div className="grid grid-cols-[1fr_auto] gap-6 mt-4 items-center">
                <div className="space-y-3">
                  <Bar width={sent > 0 ? 100 : 0} strong />
                  <Bar width={pct(viewed, sent)} />
                  <Bar width={pct(interviews, sent)} />
                  <Bar width={pct(hires, sent)} />
                </div>
                <div className="text-sm space-y-2 text-muted-foreground whitespace-nowrap">
                  <p>
                    <span className="font-medium text-foreground">{sent}</span>{" "}
                    proposal{sent === 1 ? "" : "s"} sent
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{viewed}</span>{" "}
                    {viewed === 1 ? "was" : "were"} viewed
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {interviews}
                    </span>{" "}
                    interview{interviews === 1 ? "" : "s"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{hires}</span>{" "}
                    hire{hires === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-right">
                <Link
                  href="/freelancer"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  My proposals
                </Link>
              </div>
            </Card>

            {/* Client relationships */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div className="max-w-xs">
                  <h2 className="text-lg font-semibold text-foreground">
                    Client relationships
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Client relationships longer than 90 days can positively
                    impact your Job Success Score.
                  </p>
                </div>
                <div className="shrink-0 text-center">
                  <svg width="104" height="104" viewBox="0 0 104 104">
                    <circle
                      cx="52"
                      cy="52"
                      r={R}
                      fill="none"
                      strokeWidth="8"
                      className="stroke-secondary"
                    />
                    {clients.length > 0 && (
                      <>
                        <circle
                          cx="52"
                          cy="52"
                          r={R}
                          fill="none"
                          strokeWidth="8"
                          strokeDasharray={`${
                            (longTerm / clients.length) * CIRC
                          } ${CIRC}`}
                          transform="rotate(-90 52 52)"
                          className="stroke-primary"
                        />
                        <circle
                          cx="52"
                          cy="52"
                          r={R}
                          fill="none"
                          strokeWidth="8"
                          strokeDasharray={`${
                            (shortTerm / clients.length) * CIRC
                          } ${CIRC}`}
                          strokeDashoffset={-((longTerm / clients.length) * CIRC)}
                          transform="rotate(-90 52 52)"
                          className="stroke-primary/40"
                        />
                      </>
                    )}
                    <text
                      x="52"
                      y="58"
                      textAnchor="middle"
                      className="fill-foreground"
                      fontSize="22"
                      fontWeight="700"
                    >
                      {clients.length > 0 ? clients.length : "–"}
                    </text>
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-end">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                  More than 90 days ({longTerm})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/40 inline-block" />
                  Less than 90 days ({shortTerm})
                </span>
              </div>
            </Card>

            {/* Talent badge */}
            <Card>
              {badgeMeta ? (
                <div className="text-center py-2">
                  <div className="text-4xl" aria-hidden>
                    {badgeMeta.icon}
                  </div>
                  <p
                    className={`inline-block mt-2 text-sm font-semibold rounded-full px-3 py-1 ${badgeMeta.className}`}
                  >
                    {badgeMeta.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {badgeMeta.title}
                  </p>
                  <Link
                    href="/badges"
                    className="text-primary hover:underline text-sm font-medium inline-block mt-3"
                  >
                    View badge details
                  </Link>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-4xl opacity-30" aria-hidden>
                    🌱
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground/60 mt-1">
                    Rising Talent
                  </p>
                  <Link
                    href="/badges"
                    className="text-primary hover:underline text-sm font-medium inline-block mt-2"
                  >
                    Earn Rising Talent
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">{children}</div>
  );
}

// Funnel bar for the proposals card.
function Bar({ width, strong = false }: { width: number; strong?: boolean }) {
  return (
    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full ${strong ? "bg-primary" : "bg-primary/60"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Server-rendered period selector (links, so stats stay real-time on load).
function RangePills({
  current,
  options,
  build,
}: {
  current: number;
  options: number[];
  build: (n: number) => string;
}) {
  return (
    <span className="flex items-center gap-1 text-sm">
      {options.map((n) => (
        <Link
          key={n}
          href={build(n)}
          className={`rounded-full px-3 py-1 border ${
            current === n
              ? "border-primary text-primary font-medium bg-primary/5"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {n}d
        </Link>
      ))}
    </span>
  );
}
