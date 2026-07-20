import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { notFound, redirect } from "next/navigation";
import { completeContract } from "@/app/proposals/actions";
import {
  addMilestone,
  fundMilestone,
  submitMilestone,
  approveMilestone,
  requestChangesMilestone,
  deleteMilestone,
  proposeMilestone,
} from "@/app/milestones/actions";
import { ChatThread } from "@/components/chat-thread";
import { LocalTime } from "@/components/local-time";
import { getClientInfo } from "@/app/(dashboard)/jobs/client-actions";
import { notify } from "@/lib/notify";
import { submitReview } from "@/app/reviews/actions";
import {
  rehire,
  raiseDispute,
  resolveDispute,
  endContract,
  closureRefund,
  closureDispute,
} from "@/app/(dashboard)/contracts/actions";
import { refundEscrowAndComplete } from "@/lib/contract-closure";
import { ContractMenu } from "@/components/contract-menu";
import { StarRating } from "@/components/star-rating";
import { StarRatingInput } from "@/components/star-rating-input";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { netFromGross, feePercent, asPlan } from "@/lib/fees";
import Link from "next/link";

export default async function ContractDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; blocked?: string; warn?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "overview";
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isClient = user.id === contract.client_id;
  const isFreelancer = user.id === contract.freelancer_id;
  if (!isClient && !isFreelancer) notFound();

  // If a client-initiated closure window lapsed with no freelancer action,
  // the escrow returns to the client and the contract completes (lazy — no
  // cron needed). Reload so the page renders the settled state.
  if (
    contract.status === "active" &&
    contract.pending_closure_by &&
    contract.closure_deadline &&
    new Date(contract.closure_deadline).getTime() < Date.now()
  ) {
    await refundEscrowAndComplete(supabase, contract);
    redirect(`/contracts/${id}`);
  }

  // Is a client-ended closure decision still pending?
  const closurePending =
    contract.status === "active" && !!contract.pending_closure_by;

  const otherId = isClient ? contract.freelancer_id : contract.client_id;

  const [{ data: job }, { data: otherProfile }, { data: milestones }, { data: files }] =
    await Promise.all([
      contract.job_id
        ? supabase.from("jobs").select("*").eq("id", contract.job_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, location, country, created_at, phone, timezone, payment_verified, role"
        )
        .eq("id", otherId)
        .maybeSingle(),
      supabase
        .from("milestones")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("contract_files")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const ms = milestones ?? [];
  const paid = ms.filter((m) => m.status === "approved");
  const remaining = ms.filter((m) => m.status !== "approved");
  const paidSum = paid.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const remainingSum = remaining.reduce(
    (s, m) => s + (Number(m.amount) || 0),
    0
  );
  // Escrowed project funds = everything the client has funded (or released).
  const fundedSum = ms
    .filter(
      (m) => m.payment_status === "funded" || m.payment_status === "released"
    )
    .reduce((s, m) => s + (Number(m.amount) || 0), 0);

  const otherName =
    otherProfile?.full_name || otherProfile?.username || "Member";

  // Freelancer's plan — used to show the net (post service-fee) payout on
  // approved milestones (gross is shown while still in progress / in review).
  const { data: fplanRow } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", contract.freelancer_id)
    .maybeSingle();
  const fplan = asPlan(fplanRow?.plan);
  const feePct = feePercent(fplan);

  // ---- Reviews (double-blind) ----
  // Public columns only — private_rating/private_comment are revoked from the
  // client API roles (staff-only), so never select "*" here.
  const REVIEW_COLS =
    "id, contract_id, reviewer_id, reviewee_id, rating, comment, end_reason, created_at";
  const { data: myReview } = await supabase
    .from("reviews")
    .select(REVIEW_COLS)
    .eq("contract_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle();
  const { data: otherReview } = await supabase
    .from("reviews")
    .select(REVIEW_COLS)
    .eq("contract_id", id)
    .eq("reviewer_id", otherId)
    .maybeSingle();

  const isCompleted = contract.status === "completed";
  const startMs = contract.start_date
    ? new Date(contract.start_date).getTime()
    : Date.now();
  const isLongActive =
    contract.status === "active" &&
    Date.now() - startMs > 30 * 24 * 60 * 60 * 1000;

  async function handleComplete() {
    "use server";
    await completeContract(contract!.id);
  }

  // Messages tab — the full chat (formatting, emoji, offer cards, saves) is
  // embedded here via ChatThread. Ensure the contract conversation exists.
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id, ended_at, ended_by")
    .eq("contract_id", id)
    .maybeSingle();
  if (!conversation && tab === "messages") {
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        contract_id: id,
        job_id: contract.job_id,
        participant_1: contract.client_id,
        participant_2: contract.freelancer_id,
      })
      .select("id, ended_at, ended_by")
      .single();
    conversation = created;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offersById: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestsById: Record<string, any> = {};
  let savedIds: string[] = [];
  let myName = "You";
  let mySuspended = false;
  if (tab === "messages" && conversation) {
    const [{ data: msgRows }, { data: me }, { data: savedRows }] =
      await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("full_name, email, suspended")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("saved_messages")
          .select("message_id")
          .eq("user_id", user.id)
          .eq("conversation_id", conversation.id),
      ]);
    messages = msgRows ?? [];
    myName = me?.full_name || me?.email || "You";
    mySuspended = !!me?.suspended;
    savedIds = (savedRows ?? []).map((r) => r.message_id as string);

    const offerIds = Array.from(
      new Set(messages.map((m) => m.offer_id).filter(Boolean))
    ) as string[];
    if (offerIds.length > 0) {
      const { data: offerRows } = await supabase
        .from("contracts")
        .select(
          "id, title, amount, rate_type, end_date, offer_expires_at, freelancer_id, client_message, offer_milestones, client:profiles!client_id ( full_name )"
        )
        .in("id", offerIds);
      for (const o of offerRows ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oc: any = Array.isArray(o.client) ? o.client[0] : o.client;
        const oMs = Array.isArray(o.offer_milestones) ? o.offer_milestones : [];
        offersById[o.id] = {
          id: o.id,
          title: o.title || "Job offer",
          amount: Number(o.amount) || 0,
          rateType: o.rate_type === "hourly" ? "hourly" : "fixed",
          deadline: o.end_date ?? null,
          expiresAt: o.offer_expires_at ?? null,
          clientName: oc?.full_name || "Client",
          description: o.client_message ?? null,
          firstMilestoneName: oMs[0]?.name ?? null,
          projectFunds: oMs.length
            ? oMs.reduce(
                (s: number, m: { amount?: number }) =>
                  s + (Number(m.amount) || 0),
                0
              )
            : Number(o.amount) || 0,
          viewerIsFreelancer: o.freelancer_id === user.id,
        };
      }
    }
    const requestIds = Array.from(
      new Set(messages.map((m) => m.request_id).filter(Boolean))
    ) as string[];
    if (requestIds.length > 0) {
      const { data: requestRows } = await supabase
        .from("contract_requests")
        .select(
          "id, title, amount, rate_type, duration, client_id, freelancer:profiles!freelancer_id ( full_name )"
        )
        .in("id", requestIds);
      for (const r of requestRows ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rf: any = Array.isArray(r.freelancer)
          ? r.freelancer[0]
          : r.freelancer;
        requestsById[r.id] = {
          id: r.id,
          title: r.title || "Contract proposal",
          amount: Number(r.amount) || 0,
          rateType: r.rate_type === "hourly" ? "hourly" : "fixed",
          duration: r.duration ?? null,
          freelancerName: rf?.full_name || "Freelancer",
          viewerIsClient: r.client_id === user.id,
        };
      }
    }
    // Mark incoming as read.
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversation.id)
      .neq("sender_id", user.id)
      .eq("read", false);
  }

  // ---- Contract-details tab data --------------------------------------------
  let myLegalName: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let companyInfo: any = null;
  if (tab === "details") {
    const meLegal = await loadOwnProfile(user.id);
    myLegalName = meLegal?.id_legal_name || meLegal?.full_name || null;
    if (isFreelancer) {
      companyInfo = await getClientInfo(otherId).catch(() => null);
    }
  }

  // Recent activity feed (newest first) from the contract + milestone events.
  const clientFirstName = (isClient ? "You" : otherName.split(" ")[0]) as string;
  const freelancerFirstName = (
    isFreelancer ? "You" : otherName.split(" ")[0]
  ) as string;
  const recentActivity: { at: string; desc: string }[] = [];
  if (contract.responded_at) {
    recentActivity.push({
      at: contract.responded_at,
      desc: `${freelancerFirstName} accepted ${isClient ? "your" : `${otherName.split(" ")[0]}'s`} offer for a $${contract.amount} fixed-price project`,
    });
  } else if (contract.created_at) {
    recentActivity.push({
      at: contract.created_at,
      desc: "Contract created",
    });
  }
  for (const m of ms) {
    if (m.created_at) {
      recentActivity.push({
        at: m.created_at,
        desc: `Milestone "${m.title}" added for $${m.amount}`,
      });
    }
    if (
      (m.payment_status === "funded" || m.payment_status === "released") &&
      m.created_at
    ) {
      recentActivity.push({
        at: m.created_at,
        desc: `${clientFirstName} activated and funded milestone "${m.title}" for $${m.amount}`,
      });
    }
    if (m.submitted_at) {
      recentActivity.push({
        at: m.submitted_at,
        desc: `${freelancerFirstName} submitted work for "${m.title}"`,
      });
    }
    if (m.approved_at) {
      recentActivity.push({
        at: m.approved_at,
        desc: `${clientFirstName} approved and released "${m.title}" for $${m.amount}`,
      });
    }
  }
  recentActivity.sort((a, b) => b.at.localeCompare(a.at));

  // Feedback eligibility: after payment activity (a paid milestone) or when
  // the contract has ended.
  const feedbackEligible = isCompleted || isLongActive;
  const hasPaymentActivity = paid.length > 0;

  async function requestFeedback() {
    "use server";
    const sb = await createClient();
    const {
      data: { user: u },
    } = await sb.auth.getUser();
    if (!u) redirect("/login");
    const other =
      u.id === contract!.client_id
        ? contract!.freelancer_id
        : contract!.client_id;
    await notify(
      sb,
      other,
      "review",
      "Feedback requested",
      `Your feedback was requested on the contract "${contract!.title}". Leave a review from the contract's details tab.`,
      `/contracts/${contract!.id}?tab=details`
    );
    redirect(`/contracts/${contract!.id}?tab=details&requested=1`);
  }

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "messages", label: "Messages" },
    { key: "details", label: "Contract details" },
  ];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      {/* Completed banner */}
      {isCompleted && (
        <div className="flex items-center gap-3 mb-3">
          <p className="text-foreground font-medium">
            Completed on{" "}
            {contract.end_date
              ? new Date(contract.end_date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </p>
          {myReview?.rating && (
            <span className="flex items-center gap-1">
              <StarRating value={myReview.rating} size="text-sm" />
              <span className="text-sm text-muted-foreground">
                {myReview.rating}.0
              </span>
            </span>
          )}
        </div>
      )}

      {/* Dark header */}
      <div className="rounded-2xl bg-neutral-900 text-white p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{contract.title}</h1>
          <div className="flex items-center gap-2">
            {isCompleted && isClient && (
              <form action={rehire.bind(null, contract.id)}>
                <button className="bg-white text-neutral-900 px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90">
                  Rehire {otherName.split(" ")[0]}
                </button>
              </form>
            )}
            <ContractMenu
              contractId={contract.id}
              otherId={otherId}
              otherName={otherName}
              jobId={contract.job_id}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          {otherProfile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={otherProfile.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
              👤
            </div>
          )}
          <div>
            <p className="font-medium">{otherName}</p>
            <p className="text-xs text-neutral-400">
              {otherProfile?.country || otherProfile?.location || "—"} ·{" "}
              <LocalTime timezone={otherProfile?.timezone ?? undefined} />
            </p>
          </div>
        </div>
        <div className="flex gap-6 mt-5 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/contracts/${id}?tab=${t.key}`}
              className={`pb-1 ${
                tab === t.key
                  ? "text-white border-b-2 border-primary font-medium"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ============ OVERVIEW ============ */}
      {tab === "overview" && (
        <>
          {/* Stat row */}
          <div className="rounded-2xl border border-border bg-card p-6 mt-6 grid grid-cols-2 md:grid-cols-5 gap-6">
            <Stat label="Project price" value={`$${contract.amount}`} sub="Fixed-price" />
            <Stat label="Project funds" value={`$${fundedSum}`} />
            <Stat label={`Milestones paid (${paid.length})`} value={`$${paidSum}`} />
            <Stat
              label={`Milestones remaining (${remaining.length})`}
              value={`$${remainingSum}`}
            />
            <Stat label="Total earnings" value={`$${paidSum}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
            {/* Milestone timeline */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Milestone timeline
              </h2>
              <div className="space-y-3">
                {ms.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No milestones yet.
                  </p>
                )}
                {ms.map((m, i) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                            m.status === "approved"
                              ? "bg-primary text-white"
                              : "border border-border text-muted-foreground"
                          }`}
                        >
                          {m.status === "approved" ? "✓" : i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {m.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {["PENDING", "AVAILABLE", "WITHDRAWN"].includes(
                              (m.escrow_status as string) || ""
                            ) ? (
                              <>
                                ${netFromGross(Number(m.amount), fplan)}{" "}
                                <span className="text-xs text-muted-foreground">
                                  net · after {feePct}% fee (from ${m.amount})
                                </span>
                              </>
                            ) : (
                              <>
                                ${m.amount}
                                {["FUNDED", "IN_REVIEW"].includes(
                                  (m.escrow_status as string) || ""
                                ) ? (
                                  <span className="text-xs text-muted-foreground">
                                    {" "}
                                    · full amount, not yet available for withdrawal
                                  </span>
                                ) : null}
                              </>
                            )}
                            {m.due_date
                              ? ` · due ${new Date(m.due_date).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const es = (m.escrow_status as string) || "";
                        const map: Record<string, { label: string; cls: string }> = {
                          FUNDED: { label: "In progress · funded", cls: "bg-green-500/15 text-green-600" },
                          IN_REVIEW: { label: "In review", cls: "bg-blue-500/15 text-blue-500" },
                          PENDING: { label: "Clearing", cls: "bg-amber-500/15 text-amber-600" },
                          AVAILABLE: { label: "Available", cls: "bg-primary/15 text-primary" },
                          WITHDRAWN: { label: "Withdrawn", cls: "bg-primary/15 text-primary" },
                          CANCELLATION_WINDOW: { label: "Ended · action needed", cls: "bg-amber-500/15 text-amber-600" },
                          DISPUTE_HELD: { label: "In dispute", cls: "bg-red-500/15 text-red-600" },
                          REFUNDED: { label: "Refunded to client", cls: "bg-amber-500/15 text-amber-600" },
                        };
                        const chosen =
                          map[es] ??
                          (m.status === "submitted"
                            ? { label: "Submitted for review", cls: "bg-blue-500/15 text-blue-500" }
                            : { label: "Awaiting funding", cls: "bg-secondary text-muted-foreground" });
                        return (
                          <span className={`text-xs px-2.5 py-1 rounded-full ${chosen.cls}`}>
                            {chosen.label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Last activity + action required (like Upwork) */}
                    {(() => {
                      const released =
                        m.status === "approved" ||
                        m.payment_status === "released";
                      const funded = m.payment_status === "funded";
                      const clientFirst = (isClient
                        ? "You"
                        : otherName.split(" ")[0]) as string;
                      const freelancerFirst = (isFreelancer
                        ? "You"
                        : otherName.split(" ")[0]) as string;
                      const activity = released
                        ? `${clientFirst} approved and released the payment${m.approved_at ? ` · ${new Date(m.approved_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}`
                        : m.status === "submitted"
                          ? `${freelancerFirst} submitted work for review${m.submitted_at ? ` · ${new Date(m.submitted_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}`
                          : funded
                            ? `${clientFirst} activated and funded the milestone`
                            : `Milestone created · ${new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
                      const action =
                        funded && m.status === "pending"
                          ? `${freelancerFirst} need${isFreelancer ? "" : "s"} to start the milestone and submit work to ${isClient ? "you" : otherName.split(" ")[0]}.`
                          : m.status === "submitted"
                            ? `${clientFirst} need${isClient ? "" : "s"} to review the work and release payment.`
                            : null;
                      return (
                        <div className="mt-3 rounded-xl bg-secondary/50 px-4 py-3 text-sm space-y-1.5">
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Last activity:
                            </span>{" "}
                            {activity}
                          </p>
                          {action && (
                            <p className="text-foreground">
                              <span className="text-red-500">●</span>{" "}
                              <span className="font-medium">
                                Action required
                              </span>{" "}
                              — {action}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {contract.status === "active" &&
                      m.payment_status !== "returned" && (
                    <div className="flex items-center gap-2 mt-3">
                      {/* Client funds the milestone into escrow first */}
                      {m.status === "pending" &&
                        isClient &&
                        m.payment_status !== "funded" &&
                        m.payment_status !== "released" && (
                          <form
                            action={fundMilestone.bind(null, m.id, contract.id)}
                          >
                            <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm hover:opacity-90">
                              Fund milestone (escrow)
                            </button>
                          </form>
                        )}

                      {/* Freelancer submits once funded */}
                      {m.status === "pending" &&
                        isFreelancer &&
                        m.payment_status === "funded" && (
                          <form
                            action={submitMilestone.bind(null, m.id, contract.id)}
                          >
                            <button className="bg-primary hover:bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold">
                              Submit work
                            </button>
                          </form>
                        )}
                      {m.status === "pending" &&
                        isFreelancer &&
                        m.payment_status !== "funded" && (
                          <span className="text-sm text-muted-foreground">
                            Waiting for the client to fund this milestone.
                          </span>
                        )}

                      {/* Client reviews the submitted work: approve & pay, or
                          send it back for changes (escrow stays funded). */}
                      {m.status === "submitted" && isClient && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium text-foreground">
                            Review the submitted work
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <form
                              action={approveMilestone.bind(
                                null,
                                m.id,
                                contract.id
                              )}
                            >
                              <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold hover:opacity-90">
                                Approve &amp; pay
                              </button>
                            </form>
                            <form
                              action={requestChangesMilestone.bind(
                                null,
                                m.id,
                                contract.id
                              )}
                            >
                              <button className="border border-border text-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-secondary">
                                Request changes
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                      {m.status === "submitted" && isFreelancer && (
                        <span className="text-sm text-muted-foreground">
                          Submitted — awaiting the client&apos;s review.
                        </span>
                      )}

                      {/* Client can remove an unfunded milestone */}
                      {m.status === "pending" &&
                        isClient &&
                        m.payment_status !== "funded" &&
                        m.payment_status !== "released" && (
                          <form
                            action={deleteMilestone.bind(null, m.id, contract.id)}
                          >
                            <button className="border border-border text-muted-foreground px-4 py-1.5 rounded-full text-sm hover:bg-secondary">
                              Delete
                            </button>
                          </form>
                        )}
                    </div>
                    )}
                  </div>
                ))}
              </div>

              {contract.status === "active" && isClient && (
                <form
                  action={addMilestone.bind(null, contract.id)}
                  className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold text-foreground">Add milestone</h3>
                  <input
                    name="title"
                    placeholder="Title"
                    required
                    className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="amount"
                      type="number"
                      placeholder="Amount ($)"
                      required
                      className="bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      name="due_date"
                      type="date"
                      required
                      className="bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90">
                    Add milestone
                  </button>
                </form>
              )}

              {/* Freelancer proposes a new milestone (client funds to activate) */}
              {contract.status === "active" && isFreelancer && (
                <details className="mt-6 rounded-2xl border border-border bg-card group">
                  <summary className="px-5 py-4 cursor-pointer list-none flex items-center gap-2 text-primary font-medium">
                    <span className="w-6 h-6 rounded-full border border-primary/40 flex items-center justify-center text-sm">
                      +
                    </span>
                    Propose a new milestone
                  </summary>
                  <form
                    action={proposeMilestone.bind(null, contract.id)}
                    className="px-5 pb-5 space-y-3"
                  >
                    <p className="text-sm text-muted-foreground">
                      Suggest the next chunk of work — {otherName.split(" ")[0]}{" "}
                      activates it by funding escrow.
                    </p>
                    <input
                      name="title"
                      placeholder="Milestone title"
                      required
                      className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Amount ($)"
                        required
                        className="bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        name="due_date"
                        type="date"
                        className="bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90">
                      Propose milestone
                    </button>
                  </form>
                </details>
              )}

              {/* Client ended the contract while escrow was held — the
                  freelancer decides: release the funds or open a dispute. */}
              {closurePending && (
                <div className="mt-6 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5">
                  <p className="font-semibold text-amber-600">
                    ⏳ The client ended this contract while funds are in escrow
                  </p>
                  {contract.closure_deadline && (
                    <p className="text-sm text-foreground mt-1">
                      {isFreelancer ? "You have" : "The freelancer has"} until{" "}
                      <span className="font-medium">
                        {new Date(contract.closure_deadline).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>{" "}
                      to choose. If nothing is done by then, the escrow is
                      returned to the client automatically.
                    </p>
                  )}

                  {isFreelancer ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="font-medium text-foreground">
                          Release the funds to the client
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          If the work wasn&apos;t completed, return the escrow
                          and close the contract. You can both leave feedback.
                        </p>
                        <form
                          action={closureRefund.bind(null, contract.id)}
                          className="mt-3"
                        >
                          <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90">
                            Release funds &amp; close
                          </button>
                        </form>
                      </div>
                      <form
                        action={closureDispute.bind(null, contract.id)}
                        className="rounded-xl border border-border bg-card p-4 space-y-2"
                      >
                        <p className="font-medium text-foreground">
                          Open a dispute instead
                        </p>
                        <p className="text-sm text-muted-foreground">
                          If you delivered the work and believe you should be
                          paid, open a dispute. The escrow stays frozen and our
                          team helps resolve it — a ticket opens in your{" "}
                          <span className="text-foreground">
                            support requests
                          </span>
                          .
                        </p>
                        <textarea
                          name="reason"
                          rows={3}
                          required
                          placeholder="Explain what you delivered and why the funds are owed…"
                          className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <AttachmentUploader
                          userId={user.id}
                          pathPrefix="dispute"
                        />
                        <button className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-full text-sm font-semibold">
                          Open a dispute
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-3">
                      You ended this contract. Because funds are in escrow, the
                      freelancer is deciding whether to release them back to you
                      or open a dispute. We&apos;ll update you as soon as they
                      act.
                    </p>
                  )}
                </div>
              )}

              {contract.status === "active" && !closurePending && (
                <form action={handleComplete} className="mt-6">
                  <button className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-full">
                    Mark contract as completed
                  </button>
                </form>
              )}

              {/* End the contract early — either side, Upwork-style: pick a
                  reason, then leave public + private feedback in one step. */}
              {contract.status === "active" && !closurePending && (
                <details className="mt-4">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    End this contract
                  </summary>
                  <form
                    action={endContract.bind(null, contract.id)}
                    className="mt-3 rounded-2xl border border-border bg-card p-5 space-y-5"
                  >
                    <p className="text-sm text-foreground">
                      {isClient
                        ? "Unfunded milestones are removed. If funds are still in escrow, the freelancer gets 7 days to release them back to you or open a dispute; if they do nothing, the funds return to you automatically."
                        : "Ending the contract closes it and returns any escrow that wasn't released to the client."}
                    </p>

                    {/* 1 — reason for ending */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-foreground">
                        Why are you ending this contract?
                      </label>
                      <select
                        name="reason"
                        required
                        defaultValue=""
                        className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="" disabled>
                          Select a reason…
                        </option>
                        <option value="Job completed successfully">
                          Job completed successfully
                        </option>
                        {isClient ? (
                          <>
                            <option value="Freelancer stopped responding">
                              Freelancer stopped responding
                            </option>
                            <option value="Work quality did not meet expectations">
                              Work quality did not meet expectations
                            </option>
                            <option value="I no longer need this work done">
                              I no longer need this work done
                            </option>
                          </>
                        ) : (
                          <>
                            <option value="Client stopped responding">
                              Client stopped responding
                            </option>
                            <option value="Not enough work to continue">
                              Not enough work to continue
                            </option>
                            <option value="Payment or scope concerns">
                              Payment or scope concerns
                            </option>
                          </>
                        )}
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* 2 — public feedback (shown on their profile) */}
                    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Public feedback for {otherName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Shown on {isClient ? "the freelancer's" : "the client's"}{" "}
                          profile once you both leave feedback.
                        </p>
                      </div>
                      <StarRatingInput name="rating" />
                      <textarea
                        name="comment"
                        rows={3}
                        placeholder="Share details of your experience working together…"
                        className="w-full bg-card border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    {/* 3 — private feedback (only Xwork sees it) */}
                    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Private feedback 🔒
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Never shown to {otherName} or on any profile. It helps
                          Xwork keep the marketplace healthy.
                        </p>
                      </div>
                      <StarRatingInput name="private_rating" />
                      <textarea
                        name="private_comment"
                        rows={3}
                        placeholder="Anything you'd only tell Xwork? (optional)"
                        className="w-full bg-card border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
                      End contract &amp; submit feedback
                    </button>
                  </form>
                </details>
              )}

              {/* Dispute: open banner or raise option */}
              {contract.status === "disputed" ? (
                <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
                  <p className="font-semibold text-amber-600">
                    ⚠ Dispute open
                  </p>
                  {contract.dispute_reason && (
                    <p className="text-sm text-foreground mt-1">
                      Reason: {contract.dispute_reason}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Our team will help both sides reach a fair outcome. You can
                    keep messaging each other in the meantime.
                  </p>
                  <form
                    action={resolveDispute.bind(null, contract.id)}
                    className="mt-3"
                  >
                    <button className="border border-border text-foreground px-4 py-2 rounded-full text-sm hover:bg-secondary">
                      Mark dispute resolved
                    </button>
                  </form>
                </div>
              ) : (
                contract.status === "active" && !closurePending && (
                  <details className="mt-4">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                      Having a problem? Raise a dispute
                    </summary>
                    <form
                      action={raiseDispute.bind(null, contract.id)}
                      className="mt-3 rounded-2xl border border-border bg-card p-5 space-y-3"
                    >
                      <p className="text-sm text-foreground">
                        Tell us what went wrong. Both you and the other party can
                        keep working to resolve it.
                      </p>
                      <textarea
                        name="reason"
                        required
                        rows={3}
                        placeholder="Describe the issue…"
                        className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <AttachmentUploader userId={user.id} pathPrefix="dispute" />
                      <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full text-sm">
                        Raise dispute
                      </button>
                    </form>
                  </details>
                )
              )}
            </div>

            {/* Recent files */}
            <aside>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Recent files</h3>
                </div>
                <form
                  action={`/api/upload/${contract.id}`}
                  method="POST"
                  encType="multipart/form-data"
                  className="flex gap-2 mb-4"
                >
                  <input
                    type="file"
                    name="file"
                    required
                    className="flex-1 text-xs text-muted-foreground"
                  />
                  <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:opacity-90">
                    Upload
                  </button>
                </form>
                <div className="space-y-3">
                  {(files ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No files yet.</p>
                  )}
                  {(files ?? []).map((f) => (
                    <div key={f.id} className="text-sm">
                      <p className="text-foreground truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.file_size / 1024).toFixed(0)} kB ·{" "}
                        {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* ============ MESSAGES ============ */}
      {tab === "messages" && conversation && (
        <div className="rounded-2xl border border-border bg-card mt-6 flex flex-col h-[70vh] overflow-hidden">
          <ChatThread
            conversationId={conversation.id}
            userId={user.id}
            myName={myName}
            otherName={otherName}
            initial={messages}
            suspended={mySuspended}
            offersById={offersById}
            requestsById={requestsById}
            savedIds={savedIds}
            endedAt={conversation.ended_at ?? null}
            endedByMe={conversation.ended_by === user.id}
          />
        </div>
      )}

      {/* ============ CONTRACT DETAILS ============ */}
      {tab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-6">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Description
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {contract.client_message ||
                  job?.description ||
                  "No description available."}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
                {isFreelancer && contract.responded_at && (
                  <Link
                    href={`/freelancer/offers/${contract.id}`}
                    className="text-primary hover:underline"
                  >
                    View original offer
                  </Link>
                )}
                {isFreelancer && contract.proposal_id && (
                  <Link
                    href={`/proposals/${contract.proposal_id}`}
                    className="text-primary hover:underline"
                  >
                    View original proposal
                  </Link>
                )}
                {contract.job_id && (
                  <Link
                    href={`/jobs/${contract.job_id}`}
                    className="text-primary hover:underline"
                  >
                    View original job posting
                  </Link>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Summary
              </h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border text-sm">
                <Row label="Contract type" value="Fixed-price" />
                <Row
                  label="Start date"
                  value={
                    contract.start_date
                      ? new Date(contract.start_date).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" }
                        )
                      : "—"
                  }
                />
                {contract.end_date && (
                  <Row
                    label="End date"
                    value={new Date(contract.end_date).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  />
                )}
              </div>
              <details className="mt-3 rounded-2xl border border-border bg-card group">
                <summary className="px-4 py-3 cursor-pointer list-none text-sm font-semibold text-primary">
                  Show details
                </summary>
                <div className="divide-y divide-border text-sm border-t border-border">
                  {myLegalName && (
                    <Row
                      label="Verified name"
                      value={myLegalName.toUpperCase()}
                    />
                  )}
                  <Row label="Contract ID" value={contract.id} />
                  <Row label="Status" value={contract.status} />
                </div>
              </details>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Recent activity
              </h2>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="font-medium px-4 py-2.5 w-28">Date</th>
                      <th className="font-medium px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentActivity.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-4 text-muted-foreground"
                        >
                          No activity yet.
                        </td>
                      </tr>
                    ) : (
                      recentActivity.slice(0, 10).map((a, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {new Date(a.at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-2.5 text-foreground">
                            {a.desc}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews — double blind */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Feedback
              </h2>

              {!isCompleted && isLongActive && (
                <div className="mb-3">
                  <p className="text-primary text-sm">
                    This contract has been active for over 30 days — you can
                    request feedback from {otherName}.
                  </p>
                  <form action={requestFeedback} className="mt-2">
                    <button className="border border-primary/40 text-primary px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/5">
                      Request feedback
                    </button>
                  </form>
                </div>
              )}

              {!isCompleted && !isLongActive && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <div className="text-4xl mb-2">🌱</div>
                  <p className="font-semibold text-foreground">
                    This contract is not yet eligible for feedback
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    You can request feedback on active contracts with payments
                    beginning 30 days after the contract started. Feedback
                    appears on {isFreelancer ? "your" : "the freelancer's"}{" "}
                    profile and affects the Job Success Score.
                  </p>
                  <button
                    disabled
                    title="Available 30 days after the contract starts"
                    className="mt-4 border border-border text-muted-foreground px-5 py-2 rounded-full text-sm font-medium opacity-60 cursor-not-allowed"
                  >
                    Request feedback
                  </button>
                  {!hasPaymentActivity && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No payments have been released on this contract yet.
                    </p>
                  )}
                </div>
              )}

              {(isCompleted || isLongActive) && (
                <div className="space-y-4">
                  {myReview ? (
                    <div className="rounded-2xl border border-border bg-secondary p-4">
                      <div className="flex items-center gap-2">
                        <StarRating value={myReview.rating ?? 0} />
                        <span className="text-sm text-muted-foreground">
                          Your feedback ({myReview.rating}/5)
                        </span>
                      </div>
                      {myReview.comment && (
                        <p className="text-muted-foreground mt-2 text-sm">
                          {myReview.comment}
                        </p>
                      )}
                    </div>
                  ) : (
                    <form
                      action={submitReview.bind(null, contract.id, otherId)}
                      className="space-y-4 rounded-2xl border border-border bg-card p-4"
                    >
                      <p className="font-medium text-foreground">
                        Provide feedback for {otherName}
                      </p>

                      {/* Public — shown on their profile */}
                      <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Public feedback
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Shown on{" "}
                            {isClient ? "the freelancer's" : "the client's"}{" "}
                            profile once you both leave feedback.
                          </p>
                        </div>
                        <StarRatingInput name="rating" />
                        <textarea
                          name="comment"
                          rows={3}
                          placeholder="Share details of your experience…"
                          className="w-full bg-card border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      {/* Private — only Xwork sees it */}
                      <div className="space-y-2 rounded-xl border border-border bg-background p-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Private feedback 🔒
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Never shown to {otherName} or on any profile.
                          </p>
                        </div>
                        <StarRatingInput name="private_rating" />
                        <textarea
                          name="private_comment"
                          rows={3}
                          placeholder="Anything you'd only tell Xwork? (optional)"
                          className="w-full bg-card border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90">
                        Submit feedback
                      </button>
                    </form>
                  )}

                  {/* The other party's review is hidden until you submit yours */}
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      {otherName}&apos;s feedback
                    </p>
                    {!myReview ? (
                      <p className="text-sm text-muted-foreground">
                        Hidden until you leave your feedback.
                      </p>
                    ) : otherReview ? (
                      <div className="rounded-2xl border border-border bg-secondary p-4">
                        <StarRating value={otherReview.rating ?? 0} />
                        {otherReview.comment && (
                          <p className="text-muted-foreground mt-2 text-sm">
                            {otherReview.comment}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Waiting for {otherName} to leave feedback.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company / member information sidebar */}
          <aside>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm space-y-2.5">
              <h3 className="font-semibold text-foreground mb-1">
                {isClient ? "About the freelancer" : "Company information"}
              </h3>
              <p
                className={
                  otherProfile?.payment_verified
                    ? "text-primary"
                    : "text-muted-foreground"
                }
              >
                {otherProfile?.payment_verified
                  ? "✅ Payment method verified"
                  : "○ Payment method not verified"}
              </p>
              <p
                className={
                  otherProfile?.phone ? "text-primary" : "text-muted-foreground"
                }
              >
                {otherProfile?.phone
                  ? "✅ Phone number verified"
                  : "○ Phone not verified"}
              </p>
              {isFreelancer && (companyInfo?.avgRating ?? 0) > 0 && (
                <p className="text-foreground">
                  ⭐ {companyInfo.avgRating.toFixed(1)}{" "}
                  <span className="text-muted-foreground">
                    ({companyInfo.reviewCount} review
                    {companyInfo.reviewCount === 1 ? "" : "s"})
                  </span>
                </p>
              )}
              <p className="text-foreground">
                {otherProfile?.country ||
                  otherProfile?.location ||
                  "Location not set"}
                <span className="text-muted-foreground">
                  {" "}
                  · <LocalTime timezone={otherProfile?.timezone ?? undefined} />
                </span>
              </p>
              {isFreelancer && companyInfo && (
                <>
                  <p className="text-muted-foreground">
                    {companyInfo.jobsPosted} job
                    {companyInfo.jobsPosted === 1 ? "" : "s"} posted
                  </p>
                  <p className="text-muted-foreground">
                    {companyInfo.hireRate}% hire rate, {companyInfo.openJobs}{" "}
                    open job{companyInfo.openJobs === 1 ? "" : "s"}
                  </p>
                  <p className="text-muted-foreground">
                    ${companyInfo.totalSpent.toLocaleString()} total spent ·{" "}
                    {companyInfo.hires} hire
                    {companyInfo.hires === 1 ? "" : "s"}
                  </p>
                </>
              )}
              {otherProfile?.created_at && (
                <p className="text-muted-foreground">
                  Member since{" "}
                  {new Date(otherProfile.created_at).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "short" }
                  )}
                </p>
              )}
              <Link
                href={`/profile/${otherId}`}
                className="inline-block mt-2 text-primary hover:underline"
              >
                View profile
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium capitalize">{value}</span>
    </div>
  );
}
