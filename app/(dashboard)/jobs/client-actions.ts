"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getMembership } from "@/lib/membership";
import { getJobActivity } from "@/app/(dashboard)/jobs/activity-actions";

// Fetches an "About the client" summary + recent history for the job slide-in
// panel (matches Upwork's established-client view).
export async function getClientInfo(clientId: string) {
  const supabase = await createClient();
  if (!clientId) return null;

  const [
    { data: prof },
    { count: jobsPosted },
    { count: openJobs },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("created_at, total_spent, country, payment_verified, full_name")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .or("status.eq.open,status.is.null"),
    supabase
      .from("reviews")
      .select(
        "rating, comment, created_at, reviewer:profiles!reviewer_id(full_name)"
      )
      .eq("reviewee_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const list = reviews ?? [];
  const avgRating =
    list.length > 0
      ? list.reduce((s, r) => s + (r.rating ?? 0), 0) / list.length
      : 0;

  // Hires = distinct jobs this client has hired on (one contract = one hire).
  // Uses the admin client because a freelancer can't read others' contracts.
  let hiredJobs = 0;
  try {
    const admin = createAdminClient();
    const { data: contracts } = await admin
      .from("contracts")
      .select("job_id")
      .eq("client_id", clientId);
    hiredJobs = new Set((contracts ?? []).map((c) => c.job_id)).size;
  } catch {
    hiredJobs = 0;
  }

  const totalJobs = jobsPosted ?? 0;
  const hireRate = totalJobs > 0 ? Math.round((hiredJobs / totalJobs) * 100) : 0;
  // Open = posted jobs that haven't been hired on yet.
  const openCount = Math.max((openJobs ?? 0) - hiredJobs, 0);

  return {
    createdAt: prof?.created_at ?? null,
    totalSpent: Number(prof?.total_spent) || 0,
    country: prof?.country ?? null,
    paymentVerified: !!prof?.payment_verified,
    jobsPosted: totalJobs,
    openJobs: openCount,
    hires: hiredJobs,
    hireRate,
    reviewCount: list.length,
    avgRating,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reviews: list.map((r: any) => ({
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: Array.isArray(r.reviewer)
        ? r.reviewer[0]?.full_name
        : r.reviewer?.full_name,
    })),
  };
}

// Everything the client's "Review proposals" slide-in panel needs for one
// applicant: the freelancer's profile + their proposal. Guarded so only the
// job's owner can read it. Returns a plain, serializable object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _toList(v: any): any[] {
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

export async function getProposalPanelData(jobId: string, proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id) return null;

  // Owner-gated above (job.client_id === user.id). Read the applicant's full
  // profile via the service role, since the authenticated role can't read
  // sensitive profile columns cross-tenant.
  const { data: p } = await createAdminClient()
    .from("proposals")
    .select("*, profiles ( * )")
    .eq("id", proposalId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!p) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof: any = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", jobId)
    .or(
      `participant_1.eq.${p.freelancer_id},participant_2.eq.${p.freelancer_id}`
    )
    .limit(1);

  let earned = 0;
  try {
    const admin = createAdminClient();
    const { data: pays } = await admin
      .from("job_payments")
      .select("gross_amount")
      .eq("freelancer_id", p.freelancer_id);
    earned = (pays ?? []).reduce(
      (t, r) => t + (Number(r.gross_amount) || 0),
      0
    );
  } catch {
    /* best-effort */
  }

  return {
    proposalId: p.id as string,
    jobId,
    freelancerId: p.freelancer_id as string,
    name: (prof?.full_name as string) || "Freelancer",
    title: (prof?.title as string) || null,
    avatarUrl: (prof?.avatar_url as string) || null,
    location:
      (prof?.location as string) ||
      [prof?.city, prof?.country].filter(Boolean).join(", "),
    timezone: (prof?.timezone as string) || null,
    isPro: getMembership(prof).isPro,
    talentBadge: (prof?.talent_badge as string) || null,
    earned,
    jss: Number(prof?.jss_score) || 0,
    bid: p.bid_amount ?? null,
    duration: (p.duration as string) || null,
    deliveryDays: p.delivery_days ?? null,
    status: (p.status as string) || "pending",
    shortlisted: !!p.shortlisted,
    archived: !!p.archived,
    coverLetter: (p.cover_letter as string) || "",
    employment: _toList(prof?.employment),
    education: _toList(prof?.education),
    portfolio: _toList(prof?.portfolio),
    languages: _toList(prof?.languages),
    skills: String(prof?.skills || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    convoId: convo?.[0]?.id ?? null,
  };
}

export type ProposalPanelData = NonNullable<
  Awaited<ReturnType<typeof getProposalPanelData>>
>;

// ONE round-trip for everything the feed slide-over needs (client summary +
// bid range + other open jobs + activity counts). Server-action calls are
// serialized per page and each pays the middleware cost, so firing several
// separate actions on open made the panel crawl — the bid range would sit on
// "loading…" behind the other calls. Bundling them into a single action lets
// the whole panel arrive together, fast.
export async function getJobPanelData(jobId: string, clientId: string) {
  const [info, extras, activity] = await Promise.all([
    getClientInfo(clientId),
    getJobExtras(jobId, clientId),
    getJobActivity(jobId),
  ]);
  return { info, extras, activity };
}

// Extra job-detail data for the feed slide-over: the client's OTHER open jobs
// and the competitive bid range. Mirrors the full job page so both surfaces
// show the same thing.
export async function getJobExtras(jobId: string, clientId: string) {
  const supabase = await createClient();

  // Other open jobs by this client (excluding the one being viewed).
  const { data: otherJobs } = await supabase
    .from("jobs")
    .select("id, title, budget")
    .eq("client_id", clientId)
    .or("status.eq.open,status.is.null")
    .neq("id", jobId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Bid range is a Pro feature — gate it SERVER-SIDE so Basic users can't see
  // the numbers even in the network response.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isPro = false;
  if (user) {
    const { data: viewer } = await supabase
      .from("profiles")
      .select("plan, membership_status, membership_end_date, membership_autorenew")
      .eq("id", user.id)
      .maybeSingle();
    isPro = getMembership(viewer).isPro;
  }

  if (!isPro) {
    return { otherJobs: otherJobs ?? [], bidRange: null, bidLocked: true };
  }

  // Bid range across ALL proposals (service role — RLS would otherwise only
  // reveal the viewer's own). Needs 2+ bids; never exposes a single bid.
  let bidRange = { high: 0, avg: 0, low: 0 };
  try {
    const admin = createAdminClient();
    const { data: bidRows } = await admin
      .from("proposals")
      .select("bid_amount")
      .eq("job_id", jobId)
      .neq("status", "withdrawn");
    const bids = (bidRows ?? [])
      .map((r) => Number(r.bid_amount) || 0)
      .filter((n) => n > 0);
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

  return { otherJobs: otherJobs ?? [], bidRange, bidLocked: false };
}
