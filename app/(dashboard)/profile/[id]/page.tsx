import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { StarRating } from "@/components/star-rating";
import { toggleSaveTalent } from "@/app/saved-talent/actions";
import {
  InlineEdit,
  InlineListEdit,
  TextField,
  TextArea,
  SelectField,
  ShareButton,
} from "@/components/profile-inline";
import { WorkHistory } from "@/components/work-history";
import { HourlyRateEditor } from "@/components/hourly-rate-editor";
import { AvailabilityEditor } from "@/components/availability-editor";
import { PortfolioSection } from "@/components/portfolio-section";
import { TitleEditor } from "@/components/title-editor";
import { DescriptionEditor } from "@/components/description-editor";
import { ListSection } from "@/components/list-section";
import { SkillsEditor } from "@/components/skills-editor";
import { COUNTRIES } from "@/lib/countries";
import { CITIES } from "@/lib/cities";
import { LANGUAGES } from "@/lib/languages";
import { UNIVERSITIES } from "@/lib/universities";
import { DEGREES } from "@/lib/degrees";
import { LocationField } from "@/components/location-field";
import { AvatarPhotoEdit } from "@/components/avatar-photo-edit";
import { LocalTime } from "@/components/local-time";
import { computeIdentityRequired } from "@/lib/identity";
import { VideoSection } from "@/components/video-section";
import { ExpandableText } from "@/components/expandable-text";
import { SuspensionBanner } from "@/components/suspension-banner";
import { WARNING_LIMIT } from "@/lib/moderation";
import { computeJss } from "@/lib/jss";
import { talentBadgeMeta } from "@/lib/talent-badges";
import { refreshTalentStats } from "@/lib/stats-refresh";
import { getMembership } from "@/lib/membership";
import { ProBadge } from "@/components/pro-badge";
import { createAdminClient } from "@/lib/supabase-admin";

// Coerce a value into a list — handles real arrays AND JSON arrays stored as
// strings in a text column (e.g. '[{"language":"English"}]').
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toList(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {
      /* not JSON */
    }
  }
  return [];
}
// True when the value is a plain comma-separated legacy string (not JSON).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLegacyString(v: any): boolean {
  return typeof v === "string" && v.trim() !== "" && !v.trim().startsWith("[");
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = Array.from({ length: 56 }, (_, i) => String(2030 - i)); // 2030 → 1975

// "Title | Company"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function empHeading(e: any) {
  return [e.title, e.company].filter(Boolean).join(" | ");
}
// "March 2021 - Present" (falls back to legacy `period`)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function empRange(e: any) {
  if (e.period) return e.period;
  const from = [e.from_month, e.from_year].filter(Boolean).join(" ");
  const to = e.current ? "Present" : [e.to_month, e.to_year].filter(Boolean).join(" ");
  if (!from && !to) return "";
  return [from, to].filter(Boolean).join(" - ");
}
// "January 2024" (falls back to legacy `issued`)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function certIssued(c: any) {
  if (c.issued) return c.issued;
  return [c.issue_month, c.issue_year].filter(Boolean).join(" ");
}

// SEO: build per-profile title / description / Open Graph tags so shared and
// crawled profile links show a rich preview.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("full_name, username, title, bio, avatar_url, profile_visibility")
    .eq("id", id)
    .maybeSingle();
  if (!p) return { title: "Profile | Xwork" };
  const name = p.full_name || p.username || "Freelancer";
  const title = p.title ? `${name} — ${p.title} | Xwork` : `${name} | Xwork`;
  const description = (p.bio || `${name} on Xwork.`).replace(/\s+/g, " ").slice(0, 160);
  // Only fully-public profiles should be indexable by search engines.
  const isPublic = (p.profile_visibility || "public") === "public";
  return {
    title,
    description,
    ...(isPublic ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      type: "profile" as const,
      images: p.avatar_url ? [{ url: p.avatar_url }] : [],
    },
    twitter: { card: "summary" as const, title, description },
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ open?: string; view?: string }>;
}) {
  const { id } = await params;
  let openSection = "";
  let view = "";
  try {
    const sp = ((await searchParams) || {}) as { open?: string; view?: string };
    openSection = sp.open || "";
    view = sp.view || "";
  } catch {
    /* ignore */
  }
  const supabase = await createClient();
  // Read the profile + embedded reviewer profiles through the service-role
  // client (server-side only). This page is public, so a logged-out visitor
  // would otherwise read the row as the `anon` role — once personal columns are
  // revoked from `anon`, this server render still works and only ever passes
  // public fields to the browser. (Reviewer email dropped from the embed too.)
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!profile) notFound();

  const { data: reviews } = await admin
    .from("reviews")
    .select(
      `id, contract_id, reviewer_id, reviewee_id, rating, comment, end_reason, created_at, reviewer:profiles!reviewer_id (full_name, avatar_url)`
    )
    .eq("reviewee_id", id)
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewList = (reviews ?? []) as any[];

  // Work history — active (in progress) + completed contracts for this freelancer.
  const { data: workContracts } = await supabase
    .from("contracts")
    .select("id, title, amount, status, start_date, end_date")
    .eq("freelancer_id", id)
    .in("status", ["active", "completed"])
    .order("start_date", { ascending: false, nullsFirst: false });

  // Map the client's review to its contract so completed jobs show feedback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewByContract: Record<string, any> = {};
  for (const r of reviewList) {
    if (r.contract_id) reviewByContract[r.contract_id] = r;
  }
  const allContracts = workContracts ?? [];
  const inProgressJobs = allContracts
    .filter((c) => c.status === "active")
    .map((c) => ({ ...c }));
  const completedJobs = allContracts
    .filter((c) => c.status === "completed")
    .map((c) => ({
      ...c,
      rating: reviewByContract[c.id]?.rating ?? null,
      comment: reviewByContract[c.id]?.comment ?? null,
    }));

  const jobsDone = completedJobs.length;

  const avgRating =
    reviewList.length > 0
      ? reviewList.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewList.length
      : 0;

  // Job Success Score for this freelancer (null until earned).
  const { data: jssContracts } = await supabase
    .from("contracts")
    .select("client_id, status")
    .eq("freelancer_id", id);
  const jssList = jssContracts ?? [];
  const perClient: Record<string, number> = {};
  for (const c of jssList) perClient[c.client_id] = (perClient[c.client_id] ?? 0) + 1;
  const jssInput = {
    ratings: reviewList.map((r) => Number(r.rating)).filter((n) => n >= 1 && n <= 5),
    completed: jssList.filter((c) => c.status === "completed").length,
    cancelled: jssList.filter(
      (c) => c.status === "cancelled" || c.status === "disputed"
    ).length,
    distinctClients: new Set(jssList.map((c) => c.client_id)).size,
    repeatClients: Object.values(perClient).filter((n) => n > 1).length,
  };
  const jss = computeJss(jssInput);
  // Stored talent badge + 15-day Job Success Score (refreshes lazily when the
  // cycle is due — viewing a profile keeps its badge honest).
  let talentBadge: string | null = profile.talent_badge ?? null;
  let jssScore: number | null = jss.score;
  if (profile.role === "freelancer") {
    try {
      const talent = await refreshTalentStats(id);
      if (talent) {
        talentBadge = talent.badge;
        jssScore = talent.jssScore;
      }
    } catch {
      /* fall back to stored/live values */
    }
  }
  const trustBadge = talentBadgeMeta(talentBadge);

  // Total earned (public). Read via the admin client since job_payments RLS
  // scopes rows to the owner. Pro members can hide this via their private
  // earnings setting (hide_earnings); Basic members always show it.
  let totalEarned = 0;
  try {
    const admin = createAdminClient();
    const { data: earnRows } = await admin
      .from("job_payments")
      .select("gross_amount")
      .eq("freelancer_id", id);
    totalEarned = (earnRows ?? []).reduce(
      (t: number, r: { gross_amount?: number | null }) =>
        t + (Number(r.gross_amount) || 0),
      0
    );
  } catch {
    totalEarned = 0;
  }
  const ownerIsPro = getMembership(profile).isPro;
  const showEarnings =
    profile.role === "freelancer" &&
    totalEarned > 0 &&
    !(ownerIsPro && profile.hide_earnings);

  const initials = (profile.full_name || profile.email || "?")
    .slice(0, 1)
    .toUpperCase();
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const owner = user?.id === id;
  // "See public view": the owner can preview their profile exactly as clients
  // see it (no edit controls). isSelf gates all editing, so turning it off in
  // preview mode hides every pencil/editor automatically.
  const previewing = owner && view === "public";
  const isSelf = owner && !previewing;

  // ── Profile visibility enforcement ──────────────────────────────────────
  // "users" (Xwork users only) and "private" profiles can only be viewed by a
  // signed-in user. The owner always sees their own profile. Discoverability
  // (talent directory, search, sitemap) is handled separately.
  const visibility = (profile.profile_visibility as string) || "public";
  // "private" = the owner ONLY (nobody else, signed in or not).
  // "users"   = any signed-in Xwork user (logged-out visitors are blocked).
  const privateOnly = visibility === "private";
  if (!owner && visibility !== "public" && (privateOnly || !user)) {
    return (
      <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold text-foreground">
            This profile is private
          </h1>
          <p className="text-muted-foreground mt-2">
            {privateOnly
              ? "This member has set their profile to private, so it isn't viewable."
              : "This member shares their profile only with signed-in Xwork users. Please sign in to view it."}
          </p>
          {!privateOnly && !user && (
            <Link
              href={`/login?redirect=/profile/${id}`}
              className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </main>
    );
  }

  // Blue verified tick is awarded only once the freelancer is identity-verified
  // AND has landed their first contract. (They can verify earlier — the prompt
  // shows before the first contract — but the public blue tick waits for it.)
  const { count: contractCount } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("freelancer_id", id);
  const hasContract = (contractCount ?? 0) >= 1;
  const verified = !!profile.id_verified && hasContract;

  // Show the "Verify your identity" prompt (gray tick) to the owner while
  // unverified and verification is required — same trigger as the banner.
  const identityRequired =
    owner && !profile.id_verified
      ? await computeIdentityRequired(supabase, id, profile)
      : false;

  // "Save" / "Invite to job" are client-only actions — show them only when a
  // logged-in CLIENT is viewing someone else's profile (never to freelancers,
  // and never in the owner's own public-view preview).
  let viewerIsClient = false;
  if (user && !owner) {
    const { data: viewer } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    viewerIsClient = viewer?.role === "client";
  }

  // Record a profile-view event when a client views a freelancer's profile —
  // this powers the Pro "profile views from client" insight. Best-effort.
  if (user && !owner && viewerIsClient && profile.role === "freelancer") {
    try {
      await supabase
        .from("profile_view_events")
        .insert({ profile_id: id, viewer_id: user.id, job_id: null });
    } catch {
      /* non-critical */
    }
  }

  let isSavedTalent = false;
  if (user && !isSelf) {
    const { data: savedRow } = await supabase
      .from("saved_talent")
      .select("id")
      .eq("user_id", user.id)
      .eq("talent_id", id)
      .maybeSingle();
    isSavedTalent = !!savedRow;
  }

  const skills = String(profile.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const categoryFirst = String(profile.categories || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)[0];
  // Example placeholder built from the freelancer's own skills/category.
  const titleExample = skills[0]
    ? `Example: ${skills[0]} Expert`
    : categoryFirst
      ? `Example: ${categoryFirst} Specialist`
      : "Example: IT Security Expert";
  // Languages / Education are structured lists now; fall back to legacy strings.
  const languageList = toList(profile.languages);
  const languagesLegacy =
    languageList.length === 0 && isLegacyString(profile.languages)
      ? String(profile.languages)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  const educationList = toList(profile.education);
  const educationLegacy =
    educationList.length === 0 && isLegacyString(profile.education)
      ? String(profile.education)
      : "";
  const licenseList = toList(profile.licenses);

  // These columns store JSON strings (e.g. '[{"title":"…"}]'), so use toList()
  // which parses them — arr() only passes through real arrays and would render
  // them empty even when data exists (which the completeness % already counts).
  const portfolio = toList(profile.portfolio);
  const certifications = toList(profile.certifications);
  const employment = toList(profile.employment);
  const otherExp = toList(profile.other_experiences);
  // Share the pretty custom URL when the freelancer set one.
  const sharePath = profile.username
    ? `/freelancer/${profile.username}`
    : `/profile/${id}`;

  // ───────────────────────── CLIENT PROFILE ─────────────────────────
  // Client accounts get their OWN public profile (jobs posted, hires, spend,
  // reviews left by freelancers) — never the freelancer work-history layout.
  if (profile.role === "client") {
    const adminC = createAdminClient();
    const [{ count: jobsPosted }, { count: hires }] = await Promise.all([
      adminC
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id),
      adminC
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id),
    ]);
    const spent = Number(profile.total_spent ?? 0);
    const stats: { label: string; value: string }[] = [
      { label: "Jobs posted", value: String(jobsPosted ?? 0) },
      { label: "Hires", value: String(hires ?? 0) },
      { label: "Total spent", value: `$${spent.toLocaleString()}` },
      {
        label: "Payment",
        value: profile.payment_verified ? "Verified ✓" : "Not verified",
      },
    ];
    return (
      <main className="min-h-screen bg-background px-4 lg:px-12 py-8 w-full">
        {profile.suspended && (
          <div className="max-w-[1000px] mx-auto mb-6">
            <SuspensionBanner self={isSelf} />
          </div>
        )}

        {/* Header */}
        <div className="max-w-[1000px] mx-auto rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start gap-5">
            <div className="shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground">
                  {profile.full_name || profile.username || "Client"}
                </h1>
                {profile.id_verified && (
                  <span
                    title="Identity verified"
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs"
                  >
                    ✓
                  </span>
                )}
                <span className="text-xs rounded-full bg-secondary text-muted-foreground px-2 py-0.5 font-medium">
                  Client
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.location ||
                  [profile.city, profile.country].filter(Boolean).join(", ") ||
                  "Location not set"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                <LocalTime timezone={profile.timezone} /> local time
              </p>
              {memberSince && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Member since {memberSince}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSelf && (
                <Link
                  href="/settings"
                  className="border border-border text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Profile settings
                </Link>
              )}
              <ShareButton path={`/profile/${id}`} label="Share" />
            </div>
          </div>
        </div>

        <div className="max-w-[1000px] mx-auto space-y-6">
          {/* Client stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Company (if provided) */}
          {(profile.company_name || profile.bio) && (
            <Card>
              {profile.company_name && (
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {profile.company_name}
                </h2>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
            </Card>
          )}

          {/* Reviews left by freelancers about this client */}
          {reviewList.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground">
                  Freelancer reviews ({reviewList.length})
                </h2>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <StarRating value={avgRating} />
                  <span className="font-semibold text-foreground">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">avg</span>
                </span>
              </div>
              <div className="space-y-5">
                {reviewList.map((r) => (
                  <div
                    key={r.id}
                    className="border-b border-border last:border-0 pb-5 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center text-sm font-semibold">
                        {(r.reviewer?.full_name || "F").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.reviewer?.full_name || "Freelancer"}
                        </p>
                        <StarRating value={Number(r.rating) || 0} size="text-sm" />
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {jobsPosted === 0 && hires === 0 && reviewList.length === 0 && (
            <Card>
              <p className="text-muted-foreground text-center py-4">
                This client hasn&apos;t posted any jobs yet.
              </p>
            </Card>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 lg:px-12 py-8 w-full">
      {previewing && (
        <div className="max-w-[1200px] mx-auto mb-4">
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">
              👁 This is a preview of how your profile looks to clients.
            </span>
            <Link
              href={`/profile/${id}`}
              className="text-sm font-semibold text-primary hover:underline shrink-0"
            >
              Back to my profile
            </Link>
          </div>
        </div>
      )}
      {profile.suspended && (
        <div className="max-w-[1200px] mx-auto mb-6">
          <SuspensionBanner self={isSelf} />
        </div>
      )}
      {/* Policy-warning line — shown only to the owner, before suspension. */}
      {owner && !profile.suspended && (profile.warnings ?? 0) > 0 && (
        <div className="max-w-[1200px] mx-auto mb-6">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
              <div className="text-sm">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  Policy warning {profile.warnings} of {WARNING_LIMIT}
                </p>
                <p className="text-foreground/80 mt-1">
                  We&apos;ve flagged attempts to share contact details or arrange
                  payment off Xwork. Keep all chat and payments on Xwork — it&apos;s
                  how we protect your payments and can support you. After{" "}
                  {WARNING_LIMIT} warnings your account is permanently suspended.{" "}
                  <Link href="/terms" className="underline font-medium">
                    Review our terms
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="max-w-[1200px] mx-auto rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                {initials}
              </div>
            )}
            {isSelf && <AvatarPhotoEdit />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">
                {profile.full_name || profile.username || "Unnamed user"}
              </h1>
              {getMembership(profile).isPro && <ProBadge />}
              {verified ? (
                <span
                  title="Identity verified"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs"
                >
                  ✓
                </span>
              ) : (
                /* Gray "not verified" tick — visible to everyone as a trust
                   signal. The clickable "Verify your identity" prompt is shown
                   only to the owner while verification is due. */
                <span className="inline-flex items-center gap-1.5">
                  <span
                    title={
                      profile.id_verified
                        ? "Verified — badge appears after the first contract"
                        : "Identity not verified yet"
                    }
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-300 text-white text-xs"
                  >
                    ✓
                  </span>
                  {identityRequired && (
                    <Link
                      href="/settings/identity"
                      className="text-sm underline text-foreground hover:text-primary"
                    >
                      Verify your identity
                    </Link>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.location ||
                [profile.city, profile.country].filter(Boolean).join(", ") ||
                "Location not set"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              <LocalTime timezone={profile.timezone} /> local time
            </p>
            {profile.role === "freelancer" &&
              (reviewList.length > 0 ||
                jssScore != null ||
                trustBadge ||
                showEarnings) && (
                <div className="flex items-center flex-wrap gap-3 mt-2">
                  {showEarnings && (
                    <span className="inline-flex items-center gap-1.5 text-sm rounded-full bg-secondary text-foreground px-3 py-1 font-semibold">
                      ${totalEarned.toLocaleString()}+ earned
                    </span>
                  )}
                  {reviewList.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <StarRating value={avgRating} />
                      <span className="font-semibold text-foreground">
                        {avgRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({reviewList.length} review
                        {reviewList.length === 1 ? "" : "s"})
                      </span>
                    </span>
                  )}
                  {jssScore != null && (
                    <span
                      title="Job Success Score — how happy clients have been with this freelancer's work"
                      className="inline-flex items-center gap-1.5 text-sm rounded-full bg-primary/10 text-primary px-3 py-1 font-semibold"
                    >
                      {jssScore}% Job Success
                    </span>
                  )}
                  {trustBadge && (
                    <span
                      title={trustBadge.title}
                      className={`inline-flex items-center gap-1 text-sm rounded-full px-3 py-1 font-semibold ${trustBadge.className}`}
                    >
                      {trustBadge.icon} {trustBadge.label}
                    </span>
                  )}
                </div>
              )}
          </div>
          {isSelf ? (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/profile/${id}?view=public`}
                className="border border-border text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                See public view
              </Link>
              <Link
                href="/settings"
                className="border border-border text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Profile settings
              </Link>
              <ShareButton path={sharePath} label="Share profile" />
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {profile.role === "freelancer" && viewerIsClient && (
                <>
                  <form
                    action={toggleSaveTalent.bind(null, id, `/profile/${id}`)}
                  >
                    <button
                      className={`rounded-full px-4 py-2 text-sm font-medium border ${
                        isSavedTalent
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      {isSavedTalent ? "★ Saved" : "☆ Save"}
                    </button>
                  </form>
                  <Link
                    href="/freelancers"
                    className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
                  >
                    Invite to job
                  </Link>
                </>
              )}
              <ShareButton path={sharePath} label="Share" />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left sidebar */}
        <aside className="rounded-2xl border border-border bg-card px-6 divide-y divide-border">
          {/* Video introduction — top of sidebar, like Upwork */}
          <VideoSection videoUrl={profile.video_url} isSelf={isSelf} />

          {/* Hours per week */}
          <section className="py-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Hours per week</h3>
              {isSelf && (
                <AvailabilityEditor
                  hours={profile.hours_per_week}
                  jobPref={profile.job_preference}
                  avgResponse={profile.avg_response}
                />
              )}
            </div>
            <p className="text-foreground mt-2">
              {profile.hours_per_week || "Not set"}
            </p>
            {profile.job_preference && (
              <p className="text-muted-foreground">{profile.job_preference}</p>
            )}
          </section>

          {/* Avg. response */}
          <section className="py-6">
            <h3 className="text-xl font-bold text-foreground">Avg. response</h3>
            <p className="text-foreground mt-2">{profile.avg_response || "—"}</p>
          </section>

          {/* Languages */}
          <ListSection
            name="languages"
            title="Languages"
            kind="language"
            variant="plain"
            items={languageList.length ? languageList : languagesLegacy.map((l) => {
              const [language, proficiency] = String(l).split(":").map((s) => s.trim());
              return { language, proficiency: proficiency || "" };
            })}
            isSelf={isSelf}
            emptyText="Add the languages you speak."
            blank={{ language: "", proficiency: "" }}
            fields={[
              { key: "language", label: "Language", type: "combo", options: LANGUAGES as unknown as string[] },
              {
                key: "proficiency",
                label: "Proficiency level",
                type: "select",
                options: ["Basic", "Conversational", "Fluent", "Native or Bilingual"],
              },
            ]}
          />

          {/* Verifications */}
          <section className="py-6">
            <h3 className="text-xl font-bold text-foreground">Verifications</h3>
            <p className="mt-2 flex items-center gap-2 text-foreground">
              ID: {profile.id_verified ? "Verified" : "Not verified"}
              {profile.id_verified && <span className="text-primary">✓</span>}
            </p>
          </section>

          {/* Licenses */}
          <ListSection
            name="licenses"
            title="Licenses"
            kind="license"
            variant="plain"
            items={licenseList}
            isSelf={isSelf}
            emptyText={isSelf ? "Add your licenses." : "No licenses listed."}
            blank={{ name: "", provider: "", year: "" }}
            fields={[
              { key: "name", label: "License name" },
              { key: "provider", label: "Issued by" },
              { key: "year", label: "Year", type: "select", options: YEARS },
            ]}
          />

          {/* Education */}
          <ListSection
            name="education"
            title="Education"
            kind="education"
            variant="plain"
            items={educationList}
            isSelf={isSelf}
            autoOpen={isSelf && openSection === "education"}
            emptyText="Add your education."
            blank={{ school: "", degree: "", start_year: "", end_year: "" }}
            fields={[
              { key: "school", label: "School", type: "combo", options: UNIVERSITIES as unknown as string[] },
              { key: "degree", label: "Degree / field of study", type: "combo", options: DEGREES as unknown as string[] },
              { key: "start_year", label: "Start year", type: "select", options: YEARS, half: true },
              { key: "end_year", label: "End year", type: "select", options: YEARS, half: true },
            ]}
          />
        </aside>

        {/* Main column */}
        <div className="space-y-8 min-w-0">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-2xl font-normal text-foreground">
                  {profile.title || "Add your professional title"}
                </h2>
                {isSelf && (
                  <TitleEditor title={profile.title} example={titleExample} />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {profile.hourly_rate != null && profile.hourly_rate !== "" && (
                  <span className="text-xl font-bold text-foreground">
                    ${profile.hourly_rate}
                    <span className="text-sm font-normal text-muted-foreground">
                      /hr
                    </span>
                  </span>
                )}
                {isSelf && <HourlyRateEditor rate={profile.hourly_rate} />}
              </div>
            </div>
            <div className="flex items-start gap-2 mt-8">
              {profile.bio ? (
                <div className="flex-1">
                  <ExpandableText
                    text={profile.bio}
                    className="text-sm text-muted-foreground leading-relaxed"
                  />
                </div>
              ) : (
                isSelf && (
                  <p className="text-muted-foreground flex-1">
                    Add an overview to tell clients about your experience.
                  </p>
                )
              )}
              {isSelf && <DescriptionEditor bio={profile.bio} />}
            </div>
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-primary hover:underline break-all"
              >
                🔗 {profile.website}
              </a>
            )}
          </Card>

          {/* Work history — right after the overview/description */}
          <WorkHistory completed={completedJobs} inProgress={inProgressJobs} />

          <PortfolioSection items={portfolio} isSelf={isSelf} />

          {(skills.length > 0 || isSelf) && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-foreground">Skills</h3>
                {isSelf && <SkillsEditor skills={profile.skills || ""} />}
              </div>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add your skills so clients can find you.</p>
              ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="text-sm bg-secondary text-foreground rounded-full px-3 py-1.5">
                    {s}
                  </span>
                ))}
              </div>
              )}
            </Card>
          )}

          <ListSection
            name="certifications"
            title="Certifications"
            kind="certification"
            items={certifications}
            isSelf={isSelf}
            autoOpen={isSelf && openSection === "certifications"}
            emptyText="Add certifications to build trust."
            blank={{ name: "", provider: "", issue_month: "", issue_year: "", description: "" }}
            fields={[
              { key: "name", label: "Certification name" },
              { key: "provider", label: "Issued by (provider)" },
              { key: "issue_month", label: "Issue month", type: "select", options: MONTHS, half: true },
              { key: "issue_year", label: "Issue year", type: "select", options: YEARS, half: true },
              { key: "description", label: "Description (optional)", type: "textarea" },
            ]}
          />

          <ListSection
            name="employment"
            title="Employment history"
            kind="employment"
            items={employment}
            isSelf={isSelf}
            autoOpen={isSelf && openSection === "employment"}
            emptyText="Add your work experience."
            blank={{ company: "", city: "", country: "", title: "", from_month: "", from_year: "", current: false, to_month: "", to_year: "", description: "" }}
            fields={[
              { key: "company", label: "Company" },
              { key: "city", label: "City", type: "combo", options: CITIES, half: true },
              { key: "country", label: "Country", type: "combo", options: [...COUNTRIES], half: true },
              { key: "title", label: "Title" },
              { key: "from_month", label: "From month", type: "select", options: MONTHS, half: true },
              { key: "from_year", label: "From year", type: "select", options: YEARS, half: true },
              { key: "current", label: "I currently work here", type: "checkbox" },
              { key: "to_month", label: "To month", type: "select", options: MONTHS, half: true },
              { key: "to_year", label: "To year", type: "select", options: YEARS, half: true },
              { key: "description", label: "Description (optional)", type: "textarea" },
            ]}
          />

          <ListSection
            name="other_experiences"
            title="Other experiences"
            kind="other"
            items={otherExp}
            isSelf={isSelf}
            autoOpen={isSelf && openSection === "other"}
            emptyText="Add anything else worth highlighting."
            blank={{ title: "", description: "" }}
            fields={[
              { key: "title", label: "Subject" },
              { key: "description", label: "Description", type: "textarea" },
            ]}
          />

          {/* Reviews from clients */}
          {profile.role === "freelancer" && reviewList.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground">
                  Reviews ({reviewList.length})
                </h2>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <StarRating value={avgRating} />
                  <span className="font-semibold text-foreground">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">avg</span>
                </span>
              </div>
              <div className="space-y-5">
                {reviewList.map((r) => (
                  <div
                    key={r.id}
                    className="border-b border-border last:border-0 pb-5 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      {r.reviewer?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.reviewer.avatar_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center text-sm font-semibold">
                          {(r.reviewer?.full_name || r.reviewer?.email || "C")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.reviewer?.full_name || "Client"}
                        </p>
                        <StarRating value={Number(r.rating) || 0} size="text-sm" />
                      </div>
                      {r.created_at && (
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      {children}
    </div>
  );
}
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}
function SideItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{children}</span>
    </div>
  );
}
