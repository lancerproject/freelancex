import { hireFreelancer } from "@/app/proposals/actions";
import { ProposalsViewedPinger } from "@/components/proposals-viewed-pinger";
import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { toggleSaveJob } from "@/app/saved/actions";
import {
  deleteJob,
  inviteToJob,
  messageFreelancer,
} from "@/app/(dashboard)/jobs/actions";
import { EXPERIENCE_LEVELS, DURATIONS, labelFor } from "@/lib/categories";
import { LocalTime } from "@/components/local-time";
import { CopyLink } from "@/components/copy-link";
import { JobActivity } from "@/components/job-activity";
import { getJobActivity } from "@/app/(dashboard)/jobs/activity-actions";
import { getClientInfo } from "@/app/(dashboard)/jobs/client-actions";
import { talentLocationLabel } from "@/lib/job-location";
import { proposalStatusLabel } from "@/lib/proposal-status";
import { JobDescription } from "@/components/job-description";
import { ReportJobButton } from "@/components/report-job-button";
import { OtherOpenJobs } from "@/components/other-open-jobs";
import { createAdminClient } from "@/lib/supabase-admin";
import { getMembership } from "@/lib/membership";
import { ProBadge } from "@/components/pro-badge";
import { talentBadgeMeta } from "@/lib/talent-badges";
import Link from "next/link";

// Relative "time ago" for when a job was posted (e.g. "2 hours ago").
function relativePosted(createdAt?: string | null): string {
  if (!createdAt) return "";
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export default async function JobDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; invited?: string; sub?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "view";
  const sub = sp.sub ?? "search";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (!job) notFound();

  const isOwner = user.id === job.client_id;

  const { data: proposalsRaw } = await supabase
    .from("proposals")
    .select(
      `*, profiles ( id, full_name, skills, title, hourly_rate, plan, membership_status, membership_end_date, membership_autorenew, talent_badge )`
    )
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  // Feature 9 — Pro proposals always rank ABOVE Basic ones (each group kept in
  // newest-first order). Tag each with is_pro for the badge.
  const proposals = (proposalsRaw ?? [])
    .map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prof: any = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return { ...p, is_pro: getMembership(prof).isPro };
    })
    .sort((a, b) => {
      if (a.is_pro !== b.is_pro) return a.is_pro ? -1 : 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  const skillList = String(job.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const proposalCount = proposals?.length || 0;
  const hired = (proposals ?? []).filter((p) => p.status === "accepted");
  const hiredCount = hired.length;

  // Offers this client sent for this job (Hire tab → Offers subtab).
  const { data: jobOffersData } = await supabase
    .from("contracts")
    .select(
      "id, title, amount, rate_type, status, created_at, responded_at, freelancer:profiles!freelancer_id ( full_name )"
    )
    .eq("job_id", id)
    .or("status.eq.offer,status.eq.declined,responded_at.not.is.null")
    .order("created_at", { ascending: false });
  const jobOffers = jobOffersData ?? [];

  // Conversations on this job (client ↔ freelancer) — powers the "Messaged"
  // subtab and the Message button's "Continue chat" state.
  const { data: jobConvos } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2")
    .eq("job_id", id);
  const convoByFreelancer: Record<string, string> = {};
  for (const c of jobConvos ?? []) {
    const other =
      c.participant_1 === job.client_id ? c.participant_2 : c.participant_1;
    if (other) convoByFreelancer[other] = c.id;
  }

  /* ============================ OWNER VIEW ============================ */
  if (isOwner) {
    const ownerActivity = await getJobActivity(id);
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("location, created_at, phone")
      .eq("id", job.client_id)
      .maybeSingle();

    const { count: openJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", job.client_id)
      .or("status.eq.open,status.is.null");

    const { count: totalJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", job.client_id);

    const { count: contractsCount } = await supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("client_id", job.client_id);

    const hireRate =
      totalJobs && totalJobs > 0
        ? Math.round(((contractsCount ?? 0) / totalJobs) * 100)
        : 0;

    // Freelancers to invite (only fetched on the invite tab)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inviteList: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invitedList: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let savedTalentList: any[] = [];
    const sel =
      "id, full_name, username, title, hourly_rate, skills, location, avatar_url, profile_visibility";

    if (tab === "invite" && sub === "search") {
      let q = supabase
        .from("profiles")
        .select(sel)
        .eq("role", "freelancer")
        .limit(20);
      if (job.category)
        q = q.ilike("skills", `%${String(job.category).split(" ")[0]}%`);
      const { data: matched } = await q;
      inviteList = matched ?? [];
      if (inviteList.length === 0) {
        const { data: anyFl } = await supabase
          .from("profiles")
          .select(sel)
          .eq("role", "freelancer")
          .limit(20);
        inviteList = anyFl ?? [];
      }
      // Don't surface profiles set to "private" in talent search.
      inviteList = inviteList.filter(
        (f) => (f.profile_visibility || "public") !== "private"
      );
    }

    if (tab === "invite" && sub === "invited") {
      // Freelancers invited to this job (derived from the invite notifications).
      const { data: notifs } = await supabase
        .from("notifications")
        .select("user_id")
        .eq("type", "invite")
        .eq("link", `/jobs/${id}`);
      const ids = [...new Set((notifs ?? []).map((n) => n.user_id))];
      if (ids.length > 0) {
        const { data } = await supabase.from("profiles").select(sel).in("id", ids);
        invitedList = data ?? [];
      }
    }

    if (tab === "invite" && sub === "saved") {
      const { data: saved } = await supabase
        .from("saved_talent")
        .select("talent_id")
        .eq("user_id", job.client_id);
      const ids = [...new Set((saved ?? []).map((s) => s.talent_id))];
      if (ids.length > 0) {
        const { data } = await supabase.from("profiles").select(sel).in("id", ids);
        savedTalentList = data ?? [];
      }
    }

    const STEPS = [
      { key: "view", label: "View job post" },
      { key: "invite", label: "Invite freelancers" },
      { key: "proposals", label: `Review proposals (${proposalCount})` },
      { key: "hire", label: `Hire (${hiredCount})` },
    ];

    return (
      <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
          <p className="text-sm mt-1">
            <span className="text-primary font-semibold">30 invites</span>
            <span className="text-muted-foreground"> left</span>
          </p>
        </div>

        {/* Chevron stepper */}
        <div className="flex gap-1.5 mb-10">
          {STEPS.map((s, i) => {
            const active = tab === s.key;
            const first = i === 0;
            const last = i === STEPS.length - 1;
            const clipPath = first
              ? "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)"
              : last
              ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 24px 50%)"
              : "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)";
            return (
              <Link
                key={s.key}
                href={`/jobs/${id}?tab=${s.key}`}
                style={{ clipPath }}
                className={`flex-1 flex items-center justify-center px-6 py-6 text-sm font-semibold uppercase tracking-wide transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        {/* ---------- TAB: VIEW JOB POST ---------- */}
        {tab === "view" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Posted {relativePosted(job.created_at)} · 📍 {talentLocationLabel(job)}
              </p>
              <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
                Summary
              </p>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>

              <div className="flex flex-wrap gap-8 mt-6 pt-6 border-t border-border">
                <div>
                  <p className="text-foreground font-semibold">${job.budget}</p>
                  <p className="text-muted-foreground text-sm">Fixed-price</p>
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    {labelFor(EXPERIENCE_LEVELS, job.experience_level) ||
                      "Intermediate"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Experience level
                  </p>
                </div>
                {job.category && (
                  <div>
                    <p className="text-foreground font-semibold">
                      {job.category}
                    </p>
                    <p className="text-muted-foreground text-sm">Category</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium">
                    Project Type:
                  </span>{" "}
                  One-time project
                </p>
              </div>

              {skillList.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-foreground font-semibold mb-2">
                    Skills and expertise
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skillList.map((s) => (
                      <span
                        key={s}
                        className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border text-sm">
                <p className="text-foreground font-semibold mb-2">
                  Activity on this job
                </p>
                <JobActivity jobId={id} initial={ownerActivity} />
              </div>
            </div>

            {/* Manage + About the client */}
            <aside className="space-y-6 text-sm">
              {/* Manage links with icons */}
              <div className="space-y-3">
                <Link
                  href="/jobs/new"
                  className="flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  ✎ Edit posting
                </Link>
                <Link
                  href={`/jobs/${id}`}
                  className="flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  👁 View posting
                </Link>
                <Link
                  href="/jobs/new"
                  className="flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  🔁 Reuse posting
                </Link>
                <form action={deleteJob.bind(null, job.id)}>
                  <button className="flex items-center gap-2 text-destructive hover:underline font-medium">
                    ✕ Remove posting
                  </button>
                </form>
                <span className="flex items-center gap-2 text-muted-foreground font-medium">
                  🚫 Make private
                </span>
              </div>

              {/* About the client */}
              <div className="border-t border-border pt-5">
                <h3 className="font-semibold text-foreground text-base mb-3">
                  About the client
                </h3>
                <p className="text-muted-foreground">
                  Payment method not verified
                </p>
                <p
                  className={`mt-2 ${
                    clientProfile?.phone
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {clientProfile?.phone
                    ? "✓ Phone number verified"
                    : "Phone number not verified"}
                </p>
                <p className="text-foreground mt-3">
                  {clientProfile?.location || "Location not set"}
                  {clientProfile?.location && (
                    <>
                      {" · "}
                      <LocalTime /> local time
                    </>
                  )}
                </p>
                <p className="text-muted-foreground mt-3">
                  {hireRate}% hire rate, {openJobs ?? 0} open job
                  {(openJobs ?? 0) === 1 ? "" : "s"}
                </p>
                {clientProfile?.created_at && (
                  <p className="text-muted-foreground mt-3">
                    Member since{" "}
                    {new Date(clientProfile.created_at).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </p>
                )}
                <div className="mt-4">
                  <p className="text-foreground font-semibold mb-1">Job link</p>
                  <CopyLink path={`/jobs/${id}`} />
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ---------- TAB: INVITE FREELANCERS ---------- */}
        {tab === "invite" && (
          <div>
            <div className="flex gap-6 border-b border-border mb-6 text-sm">
              {[
                { key: "search", label: "Search" },
                { key: "invited", label: "Invited Freelancers" },
                { key: "hires", label: "My Hires" },
                { key: "saved", label: "Saved" },
              ].map((t) => (
                <Link
                  key={t.key}
                  href={`/jobs/${id}?tab=invite&sub=${t.key}`}
                  className={`pb-2 ${
                    sub === t.key
                      ? "border-b-2 border-primary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>

            {sp.invited && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary p-3 text-sm mb-4">
                Invitation sent.
              </div>
            )}

            {/* SEARCH */}
            {sub === "search" && (
              <>
                {job.category && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Filters preselected based on your job post:{" "}
                    <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1">
                      Category: {job.category}
                    </span>
                  </p>
                )}
                <div className="space-y-4">
                  {inviteList.map((f) => (
                    <InviteCard key={f.id} f={f} jobId={id} />
                  ))}
                  {inviteList.length === 0 && (
                    <div className="text-center text-muted-foreground py-12 rounded-2xl border border-border">
                      No freelancers available to invite yet.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* INVITED FREELANCERS */}
            {sub === "invited" &&
              (invitedList.length === 0 ? (
                <EmptyState
                  icon="🗂️"
                  title="No invited freelancers yet"
                  sub="Invite top talent before they're booked."
                />
              ) : (
                <div className="space-y-4">
                  {invitedList.map((f) => (
                    <InviteCard key={f.id} f={f} jobId={id} />
                  ))}
                </div>
              ))}

            {/* MY HIRES */}
            {sub === "hires" &&
              (hiredCount === 0 ? (
                <EmptyState
                  icon="👥"
                  title="You haven't hired anyone yet"
                  sub="Search for freelancers who can help you get work done."
                />
              ) : (
                <div className="space-y-4">
                  {hired.map((p) => {
                    const prof = Array.isArray(p.profiles)
                      ? p.profiles[0]
                      : p.profiles;
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {prof?.full_name || "Freelancer"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Hired · ${p.bid_amount}
                          </p>
                        </div>
                        <Link
                          href="/contracts"
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          View contract
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* SAVED */}
            {sub === "saved" &&
              (savedTalentList.length === 0 ? (
                <EmptyState
                  icon="💜"
                  title="You haven't saved anyone yet"
                  sub="Select the heart icon on a freelancer's profile to save your favorite talent."
                />
              ) : (
                <div className="space-y-4">
                  {savedTalentList.map((f) => (
                    <InviteCard key={f.id} f={f} jobId={id} />
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* ---------- TAB: REVIEW PROPOSALS ---------- */}
        {tab === "proposals" &&
          (() => {
            const pSub = ["shortlisted", "messaged", "archived"].includes(sub)
              ? sub
              : "all";
            return (
              <div>
                {/* Notify each freelancer that the client viewed their proposal */}
                <ProposalsViewedPinger jobId={id} />
                <div className="flex gap-6 border-b border-border mb-6 text-sm">
                  {[
                    { key: "all", label: "All proposals" },
                    { key: "shortlisted", label: "Shortlisted" },
                    { key: "messaged", label: "Messaged" },
                    { key: "archived", label: "Archived" },
                  ].map((t) => (
                    <Link
                      key={t.key}
                      href={`/jobs/${id}?tab=proposals&sub=${t.key}`}
                      className={`pb-2 ${
                        pSub === t.key
                          ? "border-b-2 border-primary text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>

                {/* ALL PROPOSALS */}
                {pSub === "all" &&
                  (proposalCount === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-12 text-center">
                      <div className="text-5xl mb-3">💼</div>
                      <p className="text-xl font-semibold text-foreground">
                        No proposals yet
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        Invite freelancers to get proposals faster.
                      </p>
                      <Link
                        href={`/jobs/${id}?tab=invite`}
                        className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
                      >
                        Invite Freelancers
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proposals?.map((p) => {
                        const prof = Array.isArray(p.profiles)
                          ? p.profiles[0]
                          : p.profiles;
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-border bg-card p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                {prof?.full_name || "Freelancer"}
                                {p.is_pro && <ProBadge size="sm" />}
                                {(() => {
                                  const tb = talentBadgeMeta(prof?.talent_badge);
                                  return tb ? (
                                    <span
                                      title={tb.title}
                                      className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${tb.className}`}
                                    >
                                      {tb.icon} {tb.label}
                                    </span>
                                  ) : null;
                                })()}
                              </p>
                              <span className="text-foreground font-medium">
                                ${p.bid_amount} · {p.delivery_days}d
                              </span>
                            </div>
                            {prof?.title && (
                              <p className="text-sm text-muted-foreground">
                                {prof.title}
                              </p>
                            )}
                            {p.cover_letter && (
                              <p className="text-sm text-foreground mt-2">
                                {p.cover_letter}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              <Link
                                href={`/profile/${p.freelancer_id}`}
                                className="text-primary hover:underline text-sm font-medium"
                              >
                                View profile
                              </Link>
                              {p.status !== "accepted" &&
                                (convoByFreelancer[p.freelancer_id] ? (
                                  <Link
                                    href={`/messages/${convoByFreelancer[p.freelancer_id]}`}
                                    className="border border-border text-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-secondary"
                                  >
                                    Continue chat
                                  </Link>
                                ) : (
                                  <form
                                    action={messageFreelancer.bind(
                                      null,
                                      id,
                                      p.freelancer_id
                                    )}
                                  >
                                    <button className="border border-border text-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-secondary">
                                      Message
                                    </button>
                                  </form>
                                ))}
                              {p.status === "pending" ? (
                                <>
                                  <Link
                                    href={`/offer/new?job=${id}&proposal=${p.id}`}
                                    className="border border-primary/40 text-primary px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/5"
                                  >
                                    Send offer
                                  </Link>
                                  <form action={hireFreelancer.bind(null, p.id)}>
                                    <button className="bg-primary hover:bg-primary text-white px-4 py-1.5 rounded-full text-sm font-medium">
                                      Hire
                                    </button>
                                  </form>
                                </>
                              ) : p.status === "accepted" ? (
                                <span className="text-primary text-sm font-semibold">
                                  Hired
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                {/* SHORTLISTED */}
                {pSub === "shortlisted" && (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">💼</div>
                    <p className="text-xl font-semibold text-foreground">
                      Shortlist your top candidates
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Proposals you shortlist will appear here so you can
                      compare them and make offers.
                    </p>
                    <Link
                      href={`/jobs/${id}?tab=proposals&sub=all`}
                      className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
                    >
                      View all proposals
                    </Link>
                  </div>
                )}

                {/* MESSAGED — proposals whose freelancer you have a chat with */}
                {pSub === "messaged" &&
                  (() => {
                    const messaged = (proposals ?? []).filter(
                      (p) =>
                        p.status !== "withdrawn" &&
                        convoByFreelancer[p.freelancer_id]
                    );
                    if (messaged.length === 0) {
                      return (
                        <div className="text-center py-16">
                          <div className="text-5xl mb-4">📬</div>
                          <p className="text-xl font-semibold text-foreground">
                            No messages yet
                          </p>
                          <p className="text-muted-foreground text-sm mt-2">
                            Start a conversation by asking a freelancer about
                            their proposal.
                          </p>
                          <Link
                            href={`/jobs/${id}?tab=proposals&sub=all`}
                            className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
                          >
                            View all proposals
                          </Link>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        {messaged.map((p) => {
                          const prof = Array.isArray(p.profiles)
                            ? p.profiles[0]
                            : p.profiles;
                          return (
                            <div
                              key={p.id}
                              className="rounded-2xl border border-border bg-card p-5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-foreground flex items-center gap-2">
                                  {prof?.full_name || "Freelancer"}
                                  {p.is_pro && <ProBadge size="sm" />}
                                </p>
                                <span className="text-foreground font-medium">
                                  ${p.bid_amount}
                                </span>
                              </div>
                              {prof?.title && (
                                <p className="text-sm text-muted-foreground">
                                  {prof.title}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-3">
                                <Link
                                  href={`/messages/${convoByFreelancer[p.freelancer_id]}`}
                                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:opacity-90"
                                >
                                  Continue chat
                                </Link>
                                <Link
                                  href={`/profile/${p.freelancer_id}`}
                                  className="text-primary hover:underline text-sm font-medium"
                                >
                                  View profile
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                {/* ARCHIVED */}
                {pSub === "archived" && (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">🗂️</div>
                    <p className="text-xl font-semibold text-foreground">
                      Your archived proposals
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Declined and withdrawn proposals will appear here.
                    </p>
                    <Link
                      href={`/jobs/${id}?tab=proposals&sub=all`}
                      className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
                    >
                      View all proposals
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ---------- TAB: HIRE ---------- */}
        {tab === "hire" &&
          (() => {
            const hSub = sub === "offers" ? "offers" : "hired";
            return (
              <div>
                <div className="flex gap-6 border-b border-border mb-6 text-sm">
                  {[
                    { key: "offers", label: "Offers" },
                    { key: "hired", label: "Hired" },
                  ].map((t) => (
                    <Link
                      key={t.key}
                      href={`/jobs/${id}?tab=hire&sub=${t.key}`}
                      className={`pb-2 ${
                        hSub === t.key
                          ? "border-b-2 border-primary text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>

                {/* OFFERS — offers this client has sent for this job */}
                {hSub === "offers" &&
                  (jobOffers.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">📂</div>
                      <p className="text-xl font-semibold text-foreground">
                        You don&apos;t have any offers yet
                      </p>
                      <p className="text-muted-foreground text-sm mt-2">
                        Review promising talent and make them an offer.
                      </p>
                      <Link
                        href={`/jobs/${id}?tab=proposals`}
                        className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
                      >
                        Review proposals
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobOffers.map((o) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const fl: any = Array.isArray(o.freelancer)
                          ? o.freelancer[0]
                          : o.freelancer;
                        const st =
                          o.status === "offer"
                            ? { label: "Pending", cls: "bg-yellow-500/15 text-yellow-600" }
                            : o.status === "declined"
                            ? { label: "Declined", cls: "bg-red-100 text-red-600" }
                            : { label: "Accepted", cls: "bg-primary/15 text-primary" };
                        return (
                          <div
                            key={o.id}
                            className="rounded-2xl border border-border bg-card p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-foreground">
                                {fl?.full_name || "Freelancer"}
                              </p>
                              <span
                                className={`text-xs rounded-full px-2.5 py-1 font-semibold ${st.cls}`}
                              >
                                {st.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {o.title} · ${o.amount}
                              {o.rate_type === "hourly" ? "/hr" : ""} · Sent{" "}
                              {new Date(o.created_at).toLocaleDateString()}
                            </p>
                            {o.status !== "offer" && o.responded_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Responded{" "}
                                {new Date(o.responded_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                {/* HIRED */}
                {hSub === "hired" &&
                  (hiredCount === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">👥</div>
                      <p className="text-xl font-semibold text-foreground">
                        You don&apos;t have any hires yet
                      </p>
                      <p className="text-muted-foreground text-sm mt-2">
                        Review proposals and make an offer to a freelancer.
                      </p>
                      <Link
                        href={`/jobs/${id}?tab=proposals`}
                        className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
                      >
                        Review proposals
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hired.map((p) => {
                        const prof = Array.isArray(p.profiles)
                          ? p.profiles[0]
                          : p.profiles;
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-semibold text-foreground">
                                {prof?.full_name || "Freelancer"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Hired · ${p.bid_amount}
                              </p>
                            </div>
                            <Link
                              href="/contracts"
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              View contract
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            );
          })()}
      </main>
    );
  }

  /* ========================== FREELANCER VIEW ========================= */
  const { data: myProposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("job_id", id)
    .eq("freelancer_id", user.id)
    .maybeSingle();
  // A withdrawn proposal doesn't count as "applied" — the freelancer can re-apply.
  const hasApplied = !!myProposal && myProposal.status !== "withdrawn";

  // Hired on this job? (an actual contract, not just an accepted proposal)
  const { data: hiredContract } = await supabase
    .from("contracts")
    .select("id, status")
    .eq("job_id", id)
    .eq("freelancer_id", user.id)
    .in("status", ["active", "completed", "disputed"])
    .limit(1)
    .maybeSingle();

  // Client extras for the sidebar (phone verification, local time, active count).
  const { data: clientExtra } = await supabase
    .from("profiles")
    .select("phone, timezone")
    .eq("id", job.client_id)
    .maybeSingle();
  const { count: clientActiveContracts } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("client_id", job.client_id)
    .eq("status", "active");

  // Has this freelancer already flagged this job? (drives the flag control state)
  const { data: myReport } = await supabase
    .from("job_reports")
    .select("id")
    .eq("job_id", id)
    .eq("freelancer_id", user.id)
    .maybeSingle();
  const alreadyReported = !!myReport;

  const { data: savedRow } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("job_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const isSaved = !!savedRow;

  const activity = await getJobActivity(id);

  // "About the client" summary: spend, hire rate, hires, reviews, member since.
  const ci = await getClientInfo(job.client_id);
  const clientMemberSince = ci?.createdAt
    ? new Date(ci.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  // Compact money like Upwork ("$3.6K total spent").
  const compactMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  // Other open jobs this client currently has (excluding the one being viewed).
  const { data: otherOpenJobs } = await supabase
    .from("jobs")
    .select("id, title, budget")
    .eq("client_id", job.client_id)
    .or("status.eq.open,status.is.null")
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Bid range is a Pro feature — gate SERVER-SIDE so Basic users never receive
  // the numbers. Fetch the viewer's plan first.
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const viewerIsPro = getMembership(viewerProfile).isPro;

  // Bid range across ALL proposals on this job (service role — RLS would
  // otherwise only reveal the viewer's own proposal). Shows freelancers the
  // competitive range without exposing anyone's individual bid.
  let bidRange = { high: 0, avg: 0, low: 0 };
  if (viewerIsPro) {
    try {
      const admin = createAdminClient();
      const { data: bidRows } = await admin
        .from("proposals")
        .select("bid_amount")
        .eq("job_id", id)
        .neq("status", "withdrawn");
      const bids = (bidRows ?? [])
        .map((r) => Number(r.bid_amount) || 0)
        .filter((n) => n > 0);
      // A range needs at least 2 bids. With 0–1 applicants we show 0.00 — that
      // also avoids revealing a single applicant's exact bid.
      if (bids.length >= 2) {
        bidRange = {
          high: Math.max(...bids),
          low: Math.min(...bids),
          avg: bids.reduce((s, n) => s + n, 0) / bids.length,
        };
      }
    } catch {
      /* leave zeros */
    }
  }
  // Relative "time ago" shown at the top of the job (e.g. "1 minute ago").
  const postedAgo = relativePosted(job.created_at);

  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ---------------- Main column ---------------- */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
          <form action={toggleSaveJob.bind(null, job.id, `/jobs/${job.id}`)}>
            <button
              type="submit"
              className={`text-sm px-3 py-1.5 rounded-lg border whitespace-nowrap transition ${
                isSaved
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {isSaved ? "★ Saved" : "☆ Save"}
            </button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground mt-2">
          Posted {postedAgo} · 📍 {talentLocationLabel(job)}
        </p>

        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2">
          Summary
        </h2>
        <JobDescription text={job.description || ""} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 border-t border-border pt-6">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-foreground font-medium">
              ${job.budget} · Fixed-price
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Experience level</p>
            <p className="text-foreground font-medium">
              {labelFor(EXPERIENCE_LEVELS, job.experience_level) ||
                "Intermediate"}
            </p>
          </div>
          {job.duration && (
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-foreground font-medium">
                {labelFor(DURATIONS, job.duration) || job.duration}
              </p>
            </div>
          )}
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mt-6 mb-2">
          Skills and expertise
        </h2>

        {skillList.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {skillList.map((s) => (
              <span
                key={s}
                className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Preferred qualifications — only shown if the client set them */}
        {(job.english_level || job.preferred_qualifications) && (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mt-8 mb-2">
              Preferred qualifications
            </h2>
            <div className="text-sm space-y-1">
              {job.english_level && (
                <p className="text-muted-foreground">
                  English level:{" "}
                  <span className="text-foreground font-medium">
                    {{
                      conversational: "Conversational",
                      fluent: "Fluent",
                      native: "Native or Bilingual",
                    }[job.english_level as string] || job.english_level}
                  </span>
                </p>
              )}
              {job.preferred_qualifications && (
                <p className="text-foreground/90 whitespace-pre-wrap">
                  {job.preferred_qualifications}
                </p>
              )}
            </div>
          </>
        )}

        {/* Activity on this job */}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mt-8 mb-2">
          Activity on this job
        </h2>
        <JobActivity jobId={id} initial={activity} />

        {viewerIsPro ? (
          <p className="text-sm text-muted-foreground mt-6">
            Bid range:{" "}
            <span className="text-foreground font-bold">
              High ${bidRange.high.toFixed(2)} · Avg ${bidRange.avg.toFixed(2)} ·
              Low ${bidRange.low.toFixed(2)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-6">
            Bid range:{" "}
            <span className="text-foreground blur-sm select-none" aria-hidden>
              $––– to $–––
            </span>{" "}
            <Link
              href="/settings/membership"
              className="text-primary hover:underline font-medium"
            >
              Upgrade to Pro to see the bid range from other users
            </Link>
          </p>
        )}

        {hiredContract ? (
          <div className="mt-8 rounded-2xl border border-green-500/30 p-4 bg-green-500/10 text-foreground">
            <p className="font-semibold flex items-center gap-2">
              <span className="text-green-600">✓</span>
              You have already been hired on this job.
              <Link
                href={`/contracts/${hiredContract.id}`}
                className="text-primary underline hover:no-underline font-semibold"
              >
                View Contract
              </Link>
            </p>
          </div>
        ) : hasApplied ? (
          <div className="mt-8 rounded-2xl border border-primary/30 p-4 bg-primary/10 text-foreground">
            <div className="flex items-center gap-2">
              <p className="font-semibold">You have already applied</p>
              <span className="text-xs font-medium bg-primary/15 text-primary rounded-full px-2.5 py-0.5">
                {proposalStatusLabel(myProposal?.status)}
              </span>
            </div>
            <Link
              href={`/proposals/${myProposal?.id}`}
              className="inline-block mt-3 text-primary hover:underline font-medium text-sm"
            >
              View your proposal →
            </Link>
          </div>
        ) : null}
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="space-y-5">
          {/* Apply / Save actions */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            {hiredContract ? (
              <div className="text-center text-sm space-y-2">
                <span className="block w-full bg-secondary text-muted-foreground rounded-full py-3 font-semibold cursor-not-allowed">
                  Apply now
                </span>
                <p className="font-semibold text-green-600">You were hired ✓</p>
                <Link
                  href={`/contracts/${hiredContract.id}`}
                  className="block text-primary hover:underline font-medium"
                >
                  View contract
                </Link>
              </div>
            ) : hasApplied ? (
              <div className="text-center text-sm space-y-2">
                <p className="font-semibold text-primary">
                  {myProposal?.status === "accepted"
                    ? "You were hired ✓"
                    : "Proposal submitted ✓"}
                </p>
                <Link
                  href={`/proposals/${myProposal?.id}`}
                  className="block text-primary hover:underline font-medium"
                >
                  View proposal
                </Link>
              </div>
            ) : (
              <Link
                href={`/jobs/${job.id}/proposal`}
                className="block text-center bg-primary text-primary-foreground rounded-full py-3 font-semibold hover:opacity-90"
              >
                Apply now
              </Link>
            )}
            <form
              action={toggleSaveJob.bind(null, job.id, `/jobs/${job.id}`)}
            >
              <button
                type="submit"
                className={`w-full rounded-full py-2.5 font-medium border ${
                  isSaved
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-foreground hover:bg-secondary"
                }`}
              >
                {isSaved ? "♥ Saved" : "♡ Save job"}
              </button>
            </form>

            <div className="pt-1">
              <ReportJobButton jobId={job.id} alreadyReported={alreadyReported} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">
              About the client
            </h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-foreground">
                <span className={ci?.paymentVerified ? "text-primary" : "text-muted-foreground"}>
                  {ci?.paymentVerified ? "✓" : "○"}
                </span>
                Payment method {ci?.paymentVerified ? "verified" : "not verified"}
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <span
                  className={
                    clientExtra?.phone ? "text-primary" : "text-muted-foreground"
                  }
                >
                  {clientExtra?.phone ? "✓" : "○"}
                </span>
                Phone number {clientExtra?.phone ? "verified" : "not verified"}
              </p>
              {ci && ci.reviewCount > 0 && (
                <p className="text-foreground">
                  ★ {ci.avgRating.toFixed(1)}{" "}
                  <span className="text-muted-foreground">
                    ({ci.reviewCount} review{ci.reviewCount === 1 ? "" : "s"})
                  </span>
                </p>
              )}
              {ci?.country && (
                <p className="text-muted-foreground">
                  📍 {ci.country}
                  {clientExtra?.timezone && (
                    <span>
                      {" "}
                      · <LocalTime timezone={clientExtra.timezone} />
                    </span>
                  )}
                </p>
              )}
              {ci && ci.totalSpent > 0 ? (
                <p className="text-muted-foreground">
                  {compactMoney(ci.totalSpent)} total spent
                  {ci.hires > 0 &&
                    ` · ${ci.hires} hire${ci.hires === 1 ? "" : "s"}`}
                  {(clientActiveContracts ?? 0) > 0 &&
                    `, ${clientActiveContracts} active`}
                </p>
              ) : (
                <span className="inline-block text-xs bg-secondary text-foreground rounded-full px-2.5 py-1">
                  New client
                </span>
              )}
              <p className="text-muted-foreground">
                {ci?.jobsPosted ?? 0} job{(ci?.jobsPosted ?? 0) === 1 ? "" : "s"} posted
                {typeof ci?.hireRate === "number" &&
                  (ci?.jobsPosted ?? 0) > 0 &&
                  ` · ${ci.hireRate}% hire rate`}
              </p>
              {ci && ci.openJobs > 0 && (
                <p className="text-muted-foreground">
                  {ci.openJobs} open job{ci.openJobs === 1 ? "" : "s"}
                </p>
              )}
              {clientMemberSince && (
                <p className="text-muted-foreground">
                  Member since {clientMemberSince}
                </p>
              )}
            </div>
          </div>

          {/* Job link + working Copy link button */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-3">Job link</h3>
            <CopyLink path={`/jobs/${job.id}`} />
          </div>

          {/* Other open jobs by this client — right sidebar, after the link */}
          <OtherOpenJobs jobs={otherOpenJobs ?? []} />
        </aside>
      </div>
    </main>
  );
}

/* Freelancer card used in the Invite tab (search / invited / saved) */
function InviteCard({
  f,
  jobId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  f: any;
  jobId: string;
}) {
  const initials = (f.full_name || f.username || "?").slice(0, 1).toUpperCase();
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      {f.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={f.avatar_url}
          alt=""
          className="w-12 h-12 rounded-full object-cover border border-border"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">
          {f.full_name || f.username || "Freelancer"}
        </p>
        {f.title && (
          <p className="text-sm text-muted-foreground">{f.title}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
          {f.location && <span>{f.location}</span>}
          {f.hourly_rate != null && f.hourly_rate !== "" && (
            <span className="text-foreground font-medium">
              ${f.hourly_rate}/hr
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Link
          href={`/profile/${f.id}`}
          className="text-center border border-border text-foreground rounded-full px-4 py-1.5 text-sm hover:bg-secondary"
        >
          View
        </Link>
        <form action={inviteToJob.bind(null, jobId, f.id)}>
          <button className="w-full bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:opacity-90">
            Invite to job
          </button>
        </form>
      </div>
    </div>
  );
}

/* Empty-state block used by the Invite sub-tabs */
function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-xl font-semibold text-foreground">{title}</p>
      <p className="text-muted-foreground text-sm mt-2">{sub}</p>
    </div>
  );
}
