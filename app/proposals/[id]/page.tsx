import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { DURATIONS, labelFor } from "@/lib/categories";
import {
  proposalStatusLabel,
  proposalStatusClasses,
  canWithdraw,
} from "@/lib/proposal-status";
import { WithdrawProposalButton } from "@/components/withdraw-proposal-button";
import { getMembership } from "@/lib/membership";
import { feePercent, netFromGross } from "@/lib/fees";
import { ProposalInsights } from "@/components/proposal-insights";
import { ProLockedCard } from "@/components/pro-locked-card";
import { createAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Your proposal | Xwork" };

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, jobs ( id, title, budget, status )")
    .eq("id", id)
    .maybeSingle();

  // Only the freelancer who submitted it can view it here.
  if (!proposal || proposal.freelancer_id !== user.id) notFound();

  // Withdrawal is HIDDEN (not disabled) when the job is closed, the freelancer
  // is hired, or a pending job offer exists for this job.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobRel: any = Array.isArray(proposal.jobs)
    ? proposal.jobs[0]
    : proposal.jobs;
  const jobIsOpen = !jobRel?.status || jobRel.status === "open";
  const { data: pendingOffer } = await supabase
    .from("contracts")
    .select("id")
    .eq("freelancer_id", user.id)
    .eq("job_id", proposal.job_id)
    .eq("status", "offer")
    .limit(1)
    .maybeSingle();
  const canWithdrawNow =
    canWithdraw(proposal.status) && jobIsOpen && !pendingOffer;

  // The viewer's plan sets their marketplace fee (Pro 5%, Basic 10%).
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const membership = getMembership(viewerProfile);

  // Proposal insights (Pro). Computed with the admin client: the rank needs all
  // proposals on the job, and client/view data aren't the freelancer's own rows.
  let insights: {
    viewed: boolean;
    viewedAt: string | null;
    clientLastActive: string | null;
    rank: number | null;
    total: number;
    profileViews: number;
  } | null = null;
  if (membership.isPro) {
    try {
      const admin = createAdminClient();
      const { data: jobRow } = await admin
        .from("jobs")
        .select("client_id")
        .eq("id", proposal.job_id)
        .maybeSingle();
      const clientId = jobRow?.client_id ?? null;

      let clientLastActive: string | null = null;
      if (clientId) {
        const { data: clientProf } = await admin
          .from("profiles")
          .select("last_active_at")
          .eq("id", clientId)
          .maybeSingle();
        clientLastActive = clientProf?.last_active_at ?? null;
      }

      const { data: allProps } = await admin
        .from("proposals")
        .select("id, created_at")
        .eq("job_id", proposal.job_id)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: true });
      const list = allProps ?? [];
      const idx = list.findIndex(
        (p: { id: string }) => p.id === proposal.id
      );

      let profileViews = 0;
      if (clientId) {
        const { count } = await admin
          .from("profile_view_events")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("viewer_id", clientId);
        profileViews = count ?? 0;
      }

      insights = {
        viewed: !!proposal.viewed_at,
        viewedAt: proposal.viewed_at ?? null,
        clientLastActive,
        rank: idx >= 0 ? idx + 1 : null,
        total: list.length,
        profileViews,
      };
    } catch {
      insights = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(proposal.jobs)
    ? proposal.jobs[0]
    : proposal.jobs;
  const money = (n: number) =>
    Number(n || 0).toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  const net = netFromGross(Number(proposal.bid_amount || 0), membership.plan);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const milestones: any[] = Array.isArray(proposal.milestones)
    ? proposal.milestones
    : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachments: any[] = Array.isArray(proposal.attachments)
    ? proposal.attachments
    : [];

  const card = "rounded-2xl border border-border bg-card p-6 lg:p-8";

  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[820px] mx-auto space-y-6">
        {/* Returns to wherever the freelancer came from (feed, dashboard,
            proposals hub) instead of always jumping to Find work. */}
        <BackLink fallback="/dashboard" label="← Back" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your proposal</h1>
            {job && (
              <Link
                href={`/jobs/${job.id}`}
                className="text-primary hover:underline font-medium"
              >
                {job.title}
              </Link>
            )}
          </div>
          <span
            className={`shrink-0 text-sm font-medium rounded-full px-3 py-1 ${proposalStatusClasses(
              proposal.status
            )}`}
          >
            {proposalStatusLabel(proposal.status)}
          </span>
        </div>

        {/* Your proposed terms */}
        <section className={card}>
          <h2 className="text-lg font-bold text-foreground">
            Your proposed terms
          </h2>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Total amount the client sees
              </span>
              <span className="text-foreground font-semibold">
                {money(proposal.bid_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                You&apos;ll receive (after {feePercent(membership.plan)}% service fee)
              </span>
              <span className="text-foreground font-semibold">{money(net)}</span>
            </div>
            {proposal.duration && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated timeline</span>
                <span className="text-foreground">
                  {labelFor(DURATIONS, proposal.duration) || proposal.duration}
                </span>
              </div>
            )}
          </div>

          {proposal.payment_type === "milestone" && milestones.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2">
                Milestones
              </p>
              <ul className="space-y-2">
                {milestones.map((m, i) => (
                  <li
                    key={i}
                    className="flex justify-between text-sm border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-foreground">
                      {m.description || `Milestone ${i + 1}`}
                      {m.due_date ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · due {m.due_date}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-foreground font-medium">
                      {money(Number(m.amount) || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Cover letter */}
        <section className={card}>
          <h2 className="text-lg font-bold text-foreground">Cover letter</h2>
          <p className="text-foreground whitespace-pre-wrap mt-3 leading-relaxed">
            {proposal.cover_letter || "—"}
          </p>
        </section>

        {/* Attachments */}
        {attachments.length > 0 && (
          <section className={card}>
            <h2 className="text-lg font-bold text-foreground">Attachments</h2>
            <ul className="mt-3 space-y-2">
              {attachments.map((a, i) => (
                <li key={i}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    📎 {a.name || "Attachment"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Proposal insights (Pro) */}
        {membership.isPro ? (
          insights && <ProposalInsights {...insights} />
        ) : (
          <ProLockedCard
            title="Proposal Insights are a Pro feature"
            body="Upgrade to see how your proposals are performing — whether the client viewed it, where you rank, their recent activity, and profile views."
          />
        )}

        {/* Withdraw / status footer — the button is hidden entirely when the
            job is closed, the freelancer is hired, or an offer is pending. */}
        {canWithdrawNow ? (
          <section className={card}>
            <p className="text-sm text-muted-foreground mb-3">
              Need to change something? You can edit your proposal while
              it&apos;s still open — or withdraw it entirely.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href={`/proposals/${proposal.id}/edit`}
                className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold hover:opacity-90"
              >
                Edit proposal
              </Link>
              <WithdrawProposalButton proposalId={proposal.id} />
            </div>
          </section>
        ) : proposal.status === "withdrawn" ? (
          <p className="text-sm text-muted-foreground">
            You withdrew this proposal. You can apply again from the job page.
          </p>
        ) : proposal.status === "accepted" ? (
          <p className="text-sm text-primary font-medium">
            🎉 You were hired for this job.
          </p>
        ) : null}
      </div>
    </main>
  );
}
