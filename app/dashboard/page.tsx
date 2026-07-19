import Link from "next/link";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import { createProfile } from "./actions";
import { publishDraft } from "@/app/(dashboard)/jobs/actions";
import { JobCardMenu } from "@/components/job-card-menu";
import { FreelancerJobFeed } from "@/components/freelancer-job-feed";
import { VisibilityControl } from "@/components/visibility-control";
import { PreferencesCard } from "@/components/preferences-card";
import { GreetingHeader } from "@/components/greeting-header";
import { GreetingWord } from "@/components/greeting-word";
import { CompleteProfileModal } from "@/components/complete-profile-modal";
import { profileChecklist } from "@/lib/profile-completion";
import { computeIdentityRequired } from "@/lib/identity";
import { wizardResumePath } from "@/lib/wizard";
import { SuspensionBanner } from "@/components/suspension-banner";
import { getMembership } from "@/lib/membership";
import { ProBadge } from "@/components/pro-badge";
import { getProposalHub } from "@/lib/proposal-hub";
import { FlashBanner } from "@/components/flash-banner";

// Always render fresh so clicking "Find work" reloads the home feed with every
// newly-posted job (no stale client Router Cache between visits).
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ joberror?: string; posted?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  // "Saved jobs" nav links here with ?tab=saved → open the feed's Saved Jobs tab.
  const initialTab = sp.tab === "saved" ? "Saved Jobs" : "";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await createProfile();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // A freelancer who hasn't finished creating their profile is sent back to
  // resume the wizard — they can't land on the dashboard until it's published.
  const resume = wizardResumePath(profile);
  if (resume) redirect(resume);

  // Never guess a role. If it's missing/invalid the account would otherwise
  // fall through to the freelancer view while the header labels it "Client"
  // (or vice-versa) — send them to pick one so the whole UI stays consistent.
  if (profile?.role !== "client" && profile?.role !== "freelancer") {
    redirect("/select-role");
  }

  const isClient = profile?.role === "client";
  const displayName =
    profile?.full_name || profile?.username || user.email?.split("@")[0];

  const banner =
    sp.joberror || sp.posted ? (
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6">
        {sp.joberror ? (
          <FlashBanner tone="error">
            Your job couldn&apos;t be posted: {sp.joberror}
          </FlashBanner>
        ) : (
          <FlashBanner tone="success">Your job was posted.</FlashBanner>
        )}
      </div>
    ) : null;

  return (
    <>
      {profile?.suspended && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6">
          <SuspensionBanner self />
        </div>
      )}
      {banner}
      {isClient ? (
        <ClientDashboard
          userId={user.id}
          name={displayName}
          email={user.email}
          profile={profile}
        />
      ) : (
        <FreelancerDashboard
          userId={user.id}
          name={displayName}
          profile={profile}
          initialTab={initialTab}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------------------- */
/* CLIENT — Upwork-style home                                              */
/* ----------------------------------------------------------------------- */
async function ClientDashboard({
  userId,
  name,
  email,
  profile,
}: {
  userId: string;
  name: string | undefined;
  email?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
}) {
  const supabase = await createClient();

  // Fire the independent reads together (jobs, this client's contracts, and a
  // few freelancers to recommend) instead of one-after-another.
  const [{ data: jobs }, { data: contractRows }, { data: talent }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, created_at, status, budget, job_type")
        .eq("client_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("contracts").select("id, job_id").eq("client_id", userId),
      supabase
        .from("profiles")
        .select(
          "id, full_name, username, title, hourly_rate, skills, location, avatar_url, profile_visibility"
        )
        .eq("role", "freelancer")
        .limit(8),
    ]);

  const jobList = jobs ?? [];
  const jobIds = jobList.map((j) => j.id);

  const proposalCounts: Record<string, number> = {};
  const newCounts: Record<string, number> = {};
  const hiredCounts: Record<string, number> = {};
  const invitedCounts: Record<string, number> = {};
  const messagedCounts: Record<string, number> = {};

  const hasContracts = (contractRows ?? []).length > 0;
  for (const c of contractRows ?? []) {
    hiredCounts[c.job_id] = (hiredCounts[c.job_id] ?? 0) + 1;
  }

  if (jobIds.length > 0) {
    // Proposals (+ how many are new/pending), invites, and message threads —
    // the same tallies Upwork shows on each job card.
    const [{ data: props }, { data: inv }, { data: convo }] = await Promise.all([
      supabase.from("proposals").select("job_id, status").in("job_id", jobIds),
      supabase.from("invites").select("job_id").in("job_id", jobIds),
      supabase.from("conversations").select("job_id").in("job_id", jobIds),
    ]);
    for (const p of props ?? []) {
      proposalCounts[p.job_id] = (proposalCounts[p.job_id] ?? 0) + 1;
      if (p.status === "pending")
        newCounts[p.job_id] = (newCounts[p.job_id] ?? 0) + 1;
    }
    for (const r of inv ?? [])
      invitedCounts[r.job_id] = (invitedCounts[r.job_id] ?? 0) + 1;
    for (const r of convo ?? [])
      messagedCounts[r.job_id] = (messagedCounts[r.job_id] ?? 0) + 1;
  }

  const timeAgo = (iso: string) => {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  // Personalized talent — a few freelancers to invite (fetched in the batch
  // above). Don't recommend profiles set to "private".
  const talentList = (talent ?? [])
    .filter((t) => (t.profile_visibility || "public") !== "private")
    .slice(0, 4);

  const isEmpty = jobList.length === 0 && !hasContracts;

  const hasProfileInfo = !!(profile?.bio || profile?.title);
  const steps = [
    {
      label: "Add a billing method",
      sub: "Required to hire",
      done: !!profile?.payment_verified,
      href: "/settings/billing",
      note: "This can increase your hiring speed by up to 3x. There's no cost until you hire.",
    },
    {
      label: "Email address verified",
      sub: "Required to hire",
      done: !!email,
      href: "/settings",
    },
    {
      label: "Post your first job",
      sub: "Find talent fast",
      done: jobList.length > 0,
      href: "/jobs/new",
      note: "Tell us what you need done and start receiving proposals within hours.",
    },
    {
      label: "Complete your profile",
      sub: "Build trust with talent",
      done: hasProfileInfo,
      href: "/settings",
      note: "Freelancers respond more to clients with a clear profile.",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allStepsDone = doneCount === steps.length;

  return (
    <main className="min-h-screen px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          <GreetingWord />, {name}
        </h1>
        <Link
          href="/jobs/new"
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition"
        >
          + Post a job
        </Link>
      </div>

      {/* Last steps before you can hire */}
      {!allStepsDone && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              Last steps before you can{" "}
              <span className="text-primary">hire</span>
            </h2>
            <span className="text-sm text-muted-foreground">
              {doneCount} of {steps.length} done
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl border bg-card p-5 ${
                  s.done ? "border-border" : "border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                    {s.done ? (
                      <p className="font-semibold text-foreground mt-1 flex items-center gap-1">
                        <span className="text-primary">✓</span> {s.label}
                      </p>
                    ) : (
                      <Link
                        href={s.href}
                        className="font-semibold text-primary hover:underline mt-1 block"
                      >
                        {s.label}
                      </Link>
                    )}
                  </div>
                  <span className="text-lg">{s.done ? "✅" : "○"}</span>
                </div>
                {s.note && !s.done && (
                  <p className="text-xs text-muted-foreground mt-2">{s.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview */}
      <h2 className="text-xl font-semibold text-foreground mb-4">Overview</h2>

      {isEmpty ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="text-foreground font-medium">
            No job posts or contracts in progress right now
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <Link
              href="/freelancers"
              className="border border-border text-foreground px-5 py-2.5 rounded-full font-medium hover:bg-secondary transition"
            >
              🔍 Find a talent
            </Link>
            <Link
              href="/jobs/new"
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-medium hover:opacity-90 transition"
            >
              + Post a job
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobList.slice(0, 6).map((job) =>
            job.status === "draft" ? (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground">
                  Draft job post
                </span>
                <h3 className="font-semibold text-foreground mt-2">
                  {job.title}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  This job isn&apos;t live yet. Publish it to start receiving
                  proposals.
                </p>
                <form
                  action={publishDraft.bind(null, job.id)}
                  className="mt-4"
                >
                  <button
                    type="submit"
                    className="border border-primary text-primary px-5 py-2 rounded-full font-medium hover:bg-primary/10 transition"
                  >
                    Publish draft
                  </button>
                </form>
              </div>
            ) : (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Title + status + created */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      📋
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-semibold text-foreground hover:text-primary block truncate"
                      >
                        {job.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full ${
                            job.status === "closed"
                              ? "bg-secondary text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {job.status === "closed" ? "Closed" : "Open job post"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Created {timeAgo(job.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-center shrink-0">
                    <div>
                      <p className="font-semibold text-foreground">
                        {invitedCounts[job.id] ?? 0}/30
                      </p>
                      <p className="text-xs text-muted-foreground">Invited</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {proposalCounts[job.id] ?? 0}
                        {(newCounts[job.id] ?? 0) > 0 && (
                          <span className="text-primary font-medium">
                            {" "}
                            ({newCounts[job.id]} new)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Proposals</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {messagedCounts[job.id] ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Messaged</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {hiredCounts[job.id] ?? 0}/1
                      </p>
                      <p className="text-xs text-muted-foreground">Hired</p>
                    </div>
                  </div>

                  {/* Action + menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/jobs/${job.id}?tab=proposals`}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 whitespace-nowrap"
                    >
                      Review proposals
                    </Link>
                    <JobCardMenu jobId={job.id} />
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Personalized talent */}
      <div className="flex items-center justify-between mt-12 mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Personalized talent
        </h2>
        <Link href="/freelancers" className="text-sm text-primary hover:underline">
          Browse talent →
        </Link>
      </div>

      {talentList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground text-sm">
          No freelancers yet. As people join, recommendations appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {talentList.map((f) => {
            const initials = (f.full_name || f.username || "?")
              .slice(0, 1)
              .toUpperCase();
            return (
              <div
                key={f.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col"
              >
                <div className="flex items-center gap-3">
                  {f.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatar_url}
                      alt={f.full_name ?? "avatar"}
                      className="w-11 h-11 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {f.full_name || f.username || "Freelancer"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.location || "—"}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {f.title || "Freelancer"}
                </p>

                {f.hourly_rate != null && f.hourly_rate !== "" && (
                  <p className="text-sm text-foreground font-medium mt-1">
                    ${f.hourly_rate}/hr
                  </p>
                )}

                <Link
                  href={`/profile/${f.id}`}
                  className="mt-4 text-center border border-border text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary transition"
                >
                  Invite to job
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Help and resources */}
      <h2 className="text-xl font-semibold text-foreground mt-12 mb-4">
        Help and resources
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            tag: "Trust & safety",
            title: "Work with talent you trust",
          },
          {
            tag: "Manage your project",
            title: "Impressed by talent? Learn about reviews",
          },
          {
            tag: "Announcements",
            title: "Check out what's new",
          },
        ].map((card) => (
          <div
            key={card.tag}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-xs uppercase tracking-wide text-primary mb-2">
              {card.tag}
            </p>
            <p className="text-foreground font-medium">{card.title}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------------- */
/* FREELANCER — overview with stats + quick actions                        */
/* ----------------------------------------------------------------------- */
async function FreelancerDashboard({
  userId,
  name,
  profile,
  initialTab = "",
}: {
  userId: string;
  name: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  initialTab?: string;
}) {
  const supabase = await createClient();

  // Everything the freelancer home needs, fired together — this was a 7-query
  // waterfall that ran on the landing page. The derivations below are unchanged.
  const [
    { data: jobsData },
    { data: savedRows },
    { data: myProps },
    { data: myContracts },
    { data: savedSearchRows },
    { count: submittedCount },
    hub,
  ] = await Promise.all([
    // Open jobs feed (older jobs may have null status → treat as open); pull
    // the client's country + a proposal count for the Upwork-style cards.
    supabase
      .from("jobs")
      .select(
        "*, proposals(count), client:profiles!client_id(country, full_name, payment_verified, total_spent)"
      )
      .or("status.eq.open,status.is.null")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("saved_jobs").select("job_id").eq("user_id", userId),
    supabase
      .from("proposals")
      .select("id, job_id, status")
      .eq("freelancer_id", userId)
      .neq("status", "withdrawn"),
    supabase
      .from("contracts")
      .select("id, job_id")
      .eq("freelancer_id", userId)
      .neq("status", "offer"),
    supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("freelancer_id", userId),
    // Proposal hub — offers, active candidates, invites, counts for the sidebar.
    getProposalHub(supabase, userId),
  ]);
  const jobs = jobsData ?? [];

  // Which of these the freelancer has saved.
  const savedIds = (savedRows ?? []).map((r) => r.job_id as string);

  // Active (non-withdrawn) proposals → "Applied" badge + "View Proposal" link.
  // For hired jobs we also resolve the contract so "View contract" can link
  // straight into the contract room.
  const applied: Record<
    string,
    { id: string; status: string; contractId?: string | null }
  > = {};
  const contractByJob: Record<string, string> = {};
  for (const c of myContracts ?? []) {
    if (c.job_id) contractByJob[c.job_id as string] = c.id as string;
  }
  for (const p of myProps ?? []) {
    applied[p.job_id as string] = {
      id: p.id as string,
      status: p.status as string,
      contractId: contractByJob[p.job_id as string] ?? null,
    };
  }

  // Saved searches power the "My Feed" tab.
  const savedSearches = savedSearchRows ?? [];

  // Profile completeness — one shared calculation (matches the popup exactly).
  const { items: checklist, percent: completeness } = profileChecklist(profile);

  // Identity verification card shows under the same rule as the top banner.
  const idRequired =
    !profile?.id_verified &&
    (await computeIdentityRequired(supabase, userId, profile));

  const displayName = profile?.full_name || name || "Your name";
  const initials = (displayName || "?").slice(0, 1).toUpperCase();
  const membership = getMembership(profile);

  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <CompleteProfileModal
        percent={completeness}
        photo={profile?.avatar_url}
        items={checklist}
      />
      {/* Verification line is rendered once, site-wide, by <IdentityBanner /> in
          the root layout — so it looks identical on every page. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* ---------------- Main column ---------------- */}
        <div className="min-w-0">
          {/* Personalized greeting (local time of day) */}
          <GreetingHeader
            name={displayName}
            badge={membership.isPro ? <ProBadge /> : undefined}
          />

          {/* Search */}
          <form action="/jobs" method="get" className="mb-4">
            <div className="flex items-center gap-2 border border-border rounded-full bg-card px-5 py-3">
              <span className="text-muted-foreground">🔍</span>
              <input
                name="q"
                placeholder="Search for jobs"
                className="flex-1 bg-transparent text-foreground outline-none"
              />
            </div>
          </form>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-6">
            Jobs you might like
          </h2>

          <FreelancerJobFeed
            jobs={jobs}
            savedIds={savedIds}
            applied={applied}
            personalized
            initialTab={initialTab}
            savedSearches={savedSearches}
            mySkills={[
              String(profile?.skills || ""),
              String(profile?.categories || ""),
            ]
              .join(",")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)}
          />
        </div>

        {/* ---------------- Right sidebar ---------------- */}
        <aside className="space-y-5 lg:mt-8">
          {/* Profile card */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <Link
                  href="/profile"
                  className="font-bold text-foreground hover:underline truncate flex items-center gap-2"
                >
                  <span className="truncate">{displayName}</span>
                  {membership.isPro && <ProBadge size="sm" />}
                </Link>
                <p className="text-sm text-muted-foreground truncate">
                  {profile?.title || "Add your professional title"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 text-sm">
              <span className="text-muted-foreground">Profile Visibility</span>
              <VisibilityControl initial={profile?.profile_visibility} />
            </div>

            <div className="mt-4">
              <Link
                href="/profile"
                className="text-sm text-primary hover:underline"
              >
                Complete your profile
              </Link>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-foreground"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <span className="text-sm text-foreground">{completeness}%</span>
              </div>
            </div>
          </div>

          {/* Identity verification — appears alongside the top banner */}
          {idRequired && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                🪪 Identity verification
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Verify your identity to keep applying, win contracts and get a
                verified badge that helps you stand out.
              </p>
              <Link
                href="/settings/identity"
                className="inline-block mt-3 text-sm text-primary font-semibold hover:underline"
              >
                Verify your identity →
              </Link>
            </div>
          )}

          {/* Preferences */}
          <PreferencesCard
            hours={profile?.hours_per_week}
            jobPref={profile?.job_preference}
            categories={profile?.categories}
          />

          {/* Proposals — strict priority order: Offers → Active Candidates →
              Invites → submitted count. Sections render only when non-empty. */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Proposals</h3>
              <Link
                href="/freelancer"
                className="text-primary hover:underline text-sm"
              >
                My Proposals
              </Link>
            </div>

            {/* 1 — Offers (highest priority) */}
            {hub.counts.pendingOffers > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 mb-3">
                <Link
                  href="/freelancer?tab=offers"
                  className="text-sm font-semibold text-red-600 hover:underline"
                >
                  🎉 {hub.counts.pendingOffers} Offer
                  {hub.counts.pendingOffers === 1 ? "" : "s"}
                </Link>
                <div className="mt-2 space-y-2">
                  {hub.pendingOffers.slice(0, 2).map((o) => (
                    <div key={o.id} className="text-sm">
                      <Link
                        href={`/freelancer/offers/${o.id}`}
                        className="font-medium text-foreground hover:text-primary block"
                      >
                        {o.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {o.clientName} · ${o.amount}
                        {o.rateType === "hourly" ? "/hr" : ""}
                      </span>{" "}
                      <Link
                        href={`/freelancer/offers/${o.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View Offer
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2 — Active candidates */}
            {hub.counts.candidates > 0 && (
              <div className="rounded-xl border border-border bg-secondary/50 p-3 mb-3">
                <Link
                  href="/freelancer?tab=candidates"
                  className="text-sm font-semibold text-foreground hover:underline"
                >
                  💬 {hub.counts.candidates} Active Candidate
                  {hub.counts.candidates === 1 ? "" : "s"}
                </Link>
                <div className="mt-2 space-y-2">
                  {hub.candidates.slice(0, 3).map((c) => (
                    <div key={c.proposalId} className="text-sm">
                      <p className="font-medium text-foreground truncate">
                        {c.jobTitle}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {c.clientName}
                        {c.firstMessagePreview
                          ? ` · “${c.firstMessagePreview.slice(0, 40)}${
                              c.firstMessagePreview.length > 40 ? "…" : ""
                            }”`
                          : ""}
                      </span>{" "}
                      <Link
                        href={`/messages/${c.conversationId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Reply
                      </Link>
                    </div>
                  ))}
                </div>
                {hub.counts.candidates > 3 && (
                  <Link
                    href="/freelancer?tab=candidates"
                    className="block text-xs text-primary hover:underline mt-2"
                  >
                    View all {hub.counts.candidates} active candidates →
                  </Link>
                )}
              </div>
            )}

            {/* 3 — Invites */}
            {hub.counts.pendingInvites > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 mb-3">
                <Link
                  href="/freelancer?tab=invites"
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  📩 {hub.counts.pendingInvites} Invite
                  {hub.counts.pendingInvites === 1 ? "" : "s"}
                </Link>
                <div className="mt-2 space-y-2">
                  {hub.pendingInvites.slice(0, 2).map((i) => (
                    <div key={i.id} className="text-sm">
                      <p className="font-medium text-foreground truncate">
                        {i.jobTitle}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {i.clientName}
                        {i.budget != null ? ` · $${i.budget}` : ""}
                      </span>{" "}
                      <Link
                        href={`/invites/${i.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View Invite
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4 — Regular submitted proposals */}
            <p className="text-sm text-muted-foreground">
              {submittedCount ?? 0} submitted proposal
              {(submittedCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>

          {/* Video introduction */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground">Video introduction</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add a short video to your profile to make a stronger first
              impression.
            </p>
            <Link
              href="/profile"
              className="inline-block mt-3 text-sm text-primary hover:underline"
            >
              Add a video
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
