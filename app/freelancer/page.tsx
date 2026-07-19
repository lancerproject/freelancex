import Link from "next/link";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import { WithdrawProposalButton } from "@/components/withdraw-proposal-button";
import { OfferActions } from "@/components/offer-actions";
import { getProposalHub, type HubOffer } from "@/lib/proposal-hub";
import { proposalStatusLabel, proposalStatusClasses } from "@/lib/proposal-status";

export const metadata = { title: "My proposals | Xwork" };

const TABS = [
  { key: "active", label: "Active" },
  { key: "candidates", label: "Active Candidates" },
  { key: "invites", label: "Invites" },
  { key: "offers", label: "Offers" },
  { key: "archived", label: "Archived" },
] as const;

export default async function MyProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; withdrawn?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "active";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hub = await getProposalHub(supabase, user.id);

  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
  const ago = (iso?: string | null) => {
    if (!iso) return "";
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };
  const money = (n: number) =>
    Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });

  const countFor = (key: string) =>
    key === "active"
      ? hub.counts.active
      : key === "candidates"
      ? hub.counts.candidates
      : key === "invites"
      ? hub.counts.invites
      : key === "offers"
      ? hub.counts.offers
      : hub.counts.archived;

  // Jobs with a pending offer — withdraw is hidden for those proposals.
  const pendingOfferJobs = new Set(
    hub.pendingOffers.map((o) => o.jobId).filter(Boolean)
  );

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <h1 className="text-3xl font-bold text-foreground mb-6">My proposals</h1>

      {sp.withdrawn && (
        <div className="max-w-[1100px] mb-5 rounded-lg border border-primary/30 bg-primary/10 text-primary p-3 text-sm">
          Your proposal has been withdrawn and moved to Archived.
        </div>
      )}

      {/* Tabs — Offers badge highlights red when pending; Invites blue. */}
      <div className="flex gap-6 border-b border-border mb-6 text-sm overflow-x-auto hide-scrollbar">
        {TABS.map((t) => {
          const n = countFor(t.key);
          const highlight =
            t.key === "offers" && hub.counts.pendingOffers > 0
              ? "bg-red-500 text-white"
              : t.key === "invites" && hub.counts.pendingInvites > 0
              ? "bg-blue-500 text-white"
              : "bg-secondary text-muted-foreground";
          return (
            <Link
              key={t.key}
              href={`/freelancer?tab=${t.key}`}
              className={`pb-3 -mb-px border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                tab === t.key
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`text-[11px] rounded-full px-1.5 py-0.5 font-semibold leading-none ${highlight}`}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="max-w-[1100px] space-y-4">
        {/* ---------------- ACTIVE ---------------- */}
        {tab === "active" && (
          <>
            {hub.hired.length > 0 && (
              <Card title={`Hired (${hub.hired.length})`}>
                {hub.hired.map((p) => {
                  const job = rel(p.jobs);
                  return (
                    <Row key={p.id}>
                      <Link
                        href={`/jobs/${job?.id}`}
                        className="text-foreground hover:text-primary"
                      >
                        {job?.title || "Job"}
                      </Link>
                      <span className="flex items-center gap-3 text-xs">
                        <span className="bg-primary/15 text-primary rounded-full px-2.5 py-1">
                          Hired
                        </span>
                        <Link href="/contracts" className="text-primary hover:underline">
                          Go to contract
                        </Link>
                      </span>
                    </Row>
                  );
                })}
              </Card>
            )}

            <Card title={`Submitted proposals (${hub.active.length})`}>
              {hub.active.length === 0 ? (
                <Empty text="You haven't submitted any proposals yet. Browse jobs to find your next project." />
              ) : (
                hub.active.map((p) => {
                  const job = rel(p.jobs);
                  return (
                    <div key={p.id} className="py-3 border-b border-border last:border-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <Link
                          href={`/jobs/${job?.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {job?.title || "Job"}
                        </Link>
                        <span
                          className={`text-xs rounded-full px-2.5 py-1 ${proposalStatusClasses(p.status)}`}
                        >
                          {proposalStatusLabel(p.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Sent {fmt(p.created_at)} · Your bid:{" "}
                        <span className="text-foreground font-medium">
                          ${p.bid_amount}
                        </span>
                        {p.delivery_days ? ` · ${p.delivery_days} days` : ""}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <Link
                          href={`/proposals/${p.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View proposal
                        </Link>
                        {/* Withdraw hidden entirely when a pending offer exists */}
                        {!pendingOfferJobs.has(job?.id) && (
                          <WithdrawProposalButton
                            proposalId={p.id}
                            redirectTo={null}
                            small
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </>
        )}

        {/* ---------------- ACTIVE CANDIDATES ---------------- */}
        {tab === "candidates" &&
          (hub.candidates.length === 0 ? (
            <Card title="Active Candidates">
              <Empty text="No active candidates yet. When a client views your proposal and messages you, they'll appear here." />
            </Card>
          ) : (
            hub.candidates.map((c) => (
              <div
                key={c.proposalId}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Link
                    href={`/jobs/${c.jobId}`}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {c.jobTitle}
                  </Link>
                  <span
                    className={`text-xs rounded-full px-2.5 py-1 ${
                      c.proposalStatus === "shortlisted"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.proposalStatus === "shortlisted" ? "Shortlisted" : "Under Review"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {c.clientName}
                  {c.clientVerified ? " ✓" : ""} · Your bid:{" "}
                  <span className="text-foreground font-medium">
                    {money(c.bidAmount)}
                  </span>
                  {c.lastMessageAt ? ` · Last message ${ago(c.lastMessageAt)}` : ""}
                </p>
                {c.firstMessagePreview && (
                  <p className="text-sm text-foreground mt-2 rounded-lg bg-secondary px-3 py-2">
                    💬 “{c.firstMessagePreview}”
                  </p>
                )}
                <Link
                  href={`/messages/${c.conversationId}`}
                  className="inline-block mt-3 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
                >
                  View &amp; Reply
                </Link>
              </div>
            ))
          ))}

        {/* ---------------- INVITES ---------------- */}
        {tab === "invites" &&
          (hub.invites.length === 0 ? (
            <Card title="Invites">
              <Empty text="No invites yet. Clients can invite you to apply to their jobs." />
            </Card>
          ) : (
            hub.invites.map((i) => (
              <div key={i.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-semibold text-foreground">{i.jobTitle}</p>
                  <span
                    className={`text-xs rounded-full px-2.5 py-1 font-semibold ${
                      i.status === "pending"
                        ? "bg-blue-500/10 text-blue-600"
                        : i.status === "accepted"
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i.status === "pending"
                      ? "Pending"
                      : i.status === "accepted"
                      ? "Accepted"
                      : "Declined"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {i.clientName}
                  {i.clientVerified ? " ✓" : ""} ·{" "}
                  {i.jobType === "hourly" ? "Hourly" : "Fixed-price"}
                  {i.budget != null ? ` · ${money(i.budget)}` : ""} · Invited{" "}
                  {fmt(i.sentAt)}
                </p>
                <Link
                  href={`/invites/${i.id}`}
                  className="inline-block mt-3 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
                >
                  View Invite
                </Link>
              </div>
            ))
          ))}

        {/* ---------------- OFFERS ---------------- */}
        {tab === "offers" &&
          (hub.offers.length === 0 ? (
            <Card title="Offers">
              <Empty text="No job offers yet. When a client offers you a job, it will appear here." />
            </Card>
          ) : (
            hub.offers.map((o) => <OfferRow key={o.id} o={o} fmt={fmt} />)
          ))}

        {/* ---------------- ARCHIVED ---------------- */}
        {tab === "archived" &&
          (hub.archived.length === 0 ? (
            <Card title="Archived">
              <Empty text="No archived proposals yet. Withdrawn or closed proposals will appear here." />
            </Card>
          ) : (
            hub.archived.map((a) => (
              <div
                key={a.proposalId}
                className="rounded-2xl border border-border bg-card p-5 opacity-80"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium text-muted-foreground">{a.jobTitle}</p>
                  <span
                    className={`text-xs rounded-full px-2.5 py-1 ${
                      a.reason === "withdrawn"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {a.reason === "withdrawn"
                      ? "Withdrawn by you"
                      : a.reason === "job_closed"
                      ? "Job Closed"
                      : "Not Selected"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {a.clientName} · Bid {money(a.bidAmount)} · Submitted{" "}
                  {fmt(a.submittedAt)} · Archived {fmt(a.archivedAt)}
                </p>
                {a.reason === "withdrawn" && a.withdrawalReason && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Reason:{" "}
                    {WITHDRAW_LABELS[a.withdrawalReason] ?? a.withdrawalReason}
                    {a.withdrawalReasonCustom
                      ? ` — “${a.withdrawalReasonCustom}”`
                      : ""}
                  </p>
                )}
                {a.jobExists && a.jobId && (
                  <Link
                    href={`/jobs/${a.jobId}`}
                    className="inline-block mt-2 text-sm text-primary hover:underline"
                  >
                    View Job
                  </Link>
                )}
              </div>
            ))
          ))}
      </div>
    </main>
  );
}

const WITHDRAW_LABELS: Record<string, string> = {
  found_other: "I found another opportunity",
  not_fit: "The job no longer fits my skills",
  budget_low: "The budget does not meet my expectations",
  made_mistake: "I made a mistake in my proposal",
  client_unresponsive: "The client is unresponsive",
  other: "Other",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rel(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

function OfferRow({
  o,
  fmt,
}: {
  o: HubOffer;
  fmt: (iso?: string | null) => string;
}) {
  const pill =
    o.status === "pending"
      ? { label: "Pending", cls: "bg-yellow-500/15 text-yellow-600" }
      : o.status === "accepted"
      ? { label: "Accepted", cls: "bg-primary/15 text-primary" }
      : o.status === "declined"
      ? { label: "Declined", cls: "bg-red-100 text-red-600" }
      : { label: "Expired", cls: "bg-secondary text-muted-foreground" };
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={`/freelancer/offers/${o.id}`}
          className="font-semibold text-foreground hover:text-primary"
        >
          🎉 {o.title}
        </Link>
        <span className={`text-xs rounded-full px-2.5 py-1 font-semibold ${pill.cls}`}>
          {pill.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {o.clientName}
        {o.clientVerified ? " ✓" : ""} · ${o.amount}
        {o.rateType === "hourly" ? "/hr (Hourly)" : " (Fixed)"} ·
        {o.deadline ? ` Deadline ${fmt(o.deadline)} ·` : ""} Sent {fmt(o.sentAt)}
      </p>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <Link
          href={`/freelancer/offers/${o.id}`}
          className="border border-border bg-card text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          👁 View Offer
        </Link>
        {o.status === "pending" && (
          <OfferActions
            offerId={o.id}
            title={o.title}
            amount={o.amount}
            rateType={o.rateType}
            clientName={o.clientName}
            deadline={o.deadline}
            compact
          />
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5">
        <span className="font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-6 pb-5 -mt-1 space-y-2 border-t border-border pt-4">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-2">{text}</p>;
}
