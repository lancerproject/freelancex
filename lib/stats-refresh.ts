// Gathers a freelancer's live performance data, refreshes their Job Success
// Score on the 15-day cycle, and awards/revokes their talent badge.
//
// Called lazily from the stats/badges/profile pages and daily from the cron —
// so scores and badges stay correct even if the cron never runs. Uses the
// service-role client because it reads other users' rows (reviews, contracts)
// and writes the stored score/badge.

import { createAdminClient } from "./supabase-admin";
import { computeJss } from "./jss";
import { profileChecklist } from "./profile-completion";
import {
  computeTalentBadge,
  JSS_UPDATE_DAYS,
  LARGE_CONTRACT_MIN,
  type BadgeInputs,
  type TalentBadgeKey,
} from "./talent-badges";

export type TalentStats = {
  inputs: BadgeInputs;
  jssScore: number | null;
  jssNeeded: string[]; // what's missing to earn a score
  jssUpdatedAt: string | null;
  nextJssUpdate: string | null;
  badge: TalentBadgeKey | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function refreshTalentStats(userId: string): Promise<TalentStats | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.role !== "freelancer") return null;

  const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  const [
    { data: reviews },
    { data: contracts },
    { data: pay12 },
    { count: payoutCount },
    { count: recentProposals },
  ] = await Promise.all([
    admin
      .from("reviews")
      .select("rating, created_at")
      .eq("reviewee_id", userId),
    admin
      .from("contracts")
      .select("id, client_id, status, created_at")
      .eq("freelancer_id", userId),
    admin
      .from("job_payments")
      .select("gross_amount, milestone_id, payment_date, job_id")
      .eq("freelancer_id", userId)
      .gte("payment_date", yearAgo),
    admin
      .from("payout_methods")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("freelancer_id", userId)
      .gte("created_at", ninetyAgo),
  ]);

  const reviewList = reviews ?? [];
  const contractList = contracts ?? [];
  const payList = pay12 ?? [];

  // ---- JSS (same formula as before) ----------------------------------------
  const ratings = reviewList
    .map((r: { rating?: number | null }) => Number(r.rating))
    .filter((n: number) => n >= 1 && n <= 5);
  const perClient: Record<string, number> = {};
  for (const c of contractList)
    perClient[c.client_id] = (perClient[c.client_id] ?? 0) + 1;
  const jss = computeJss({
    ratings,
    completed: contractList.filter((c) => c.status === "completed").length,
    cancelled: contractList.filter(
      (c) => c.status === "cancelled" || c.status === "disputed"
    ).length,
    distinctClients: new Set(contractList.map((c) => c.client_id)).size,
    repeatClients: Object.values(perClient).filter((n) => n > 1).length,
  });

  // ---- 15-day snapshot cycle ------------------------------------------------
  const lastUpdate = profile.jss_updated_at
    ? new Date(profile.jss_updated_at).getTime()
    : 0;
  const stale = Date.now() - lastUpdate > JSS_UPDATE_DAYS * 86400000;

  // The DISPLAYED score only moves on the 15-day cycle; between updates we keep
  // showing the stored one (or the fresh one the very first time).
  let storedScore: number | null = stale
    ? jss.score
    : profile.jss_score != null
    ? Number(profile.jss_score)
    : jss.score;
  if (storedScore != null) storedScore = Math.round(storedScore);
  const updatedAt = stale ? new Date().toISOString() : profile.jss_updated_at;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let history: any[] = Array.isArray(profile.jss_history)
    ? [...profile.jss_history]
    : [];

  // ---- Badge inputs -----------------------------------------------------------
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length
      : 0;
  const hasNegativeReview12mo = reviewList.some(
    (r: { rating?: number | null; created_at?: string | null }) =>
      Number(r.rating) <= 2 &&
      (!r.created_at || r.created_at >= yearAgo)
  );
  const earned12mo = payList.reduce(
    (t: number, r: { gross_amount?: number | null }) =>
      t + (Number(r.gross_amount) || 0),
    0
  );

  // Large contract: ≥$1,000 released on one job in the past 12 months where the
  // contract wasn't cancelled/disputed.
  const byJob: Record<string, number> = {};
  for (const p of payList) {
    if (p.job_id) byJob[p.job_id] = (byJob[p.job_id] ?? 0) + (Number(p.gross_amount) || 0);
  }
  const badJobs = new Set(
    contractList
      .filter((c) => c.status === "cancelled" || c.status === "disputed")
      .map((c) => c.id)
  );
  // Map contracts to jobs via job_id on contracts if present — contracts here
  // don't carry job_id, so treat any cancelled/disputed contract as disqualifying
  // only when the freelancer has no other large job. Practical rule: at least
  // one job with ≥$1,000 released AND no disputes in the period.
  const hasDispute = badJobs.size > 0;
  const largeContract12mo =
    Object.values(byJob).some((v) => v >= LARGE_CONTRACT_MIN) && !hasDispute;

  const activeLast90d =
    (recentProposals ?? 0) > 0 ||
    (profile.last_active_at && profile.last_active_at >= ninetyAgo) ||
    payList.some((p) => (p.payment_date ?? "") >= ninetyAgo);

  const firstContractAt =
    contractList.length > 0
      ? contractList
          .map((c) => c.created_at)
          .filter(Boolean)
          .sort()[0] ?? null
      : null;

  const inputs: BadgeInputs = {
    avgRating,
    ratingCount: ratings.length,
    hasNegativeReview12mo,
    earned12mo,
    profilePercent: profileChecklist(profile).percent,
    activeLast90d: !!activeLast90d,
    jssScore: storedScore,
    jssHistory: history,
    goodStanding:
      (profile.account_status ?? "active") === "active" && !profile.suspended,
    idVerified: !!profile.id_verified,
    hasPayoutMethod: (payoutCount ?? 0) > 0,
    firstContractAt,
    availabilitySet: !!profile.available,
    largeContract12mo,
    badgeBanUntil: profile.badge_ban_until ?? null,
  };

  const computed = computeTalentBadge(inputs);

  // Staff/showcase override — a manually granted badge
  // (profiles.talent_badge_override) wins over the computed one. Used to award
  // a badge by hand or to show a badge on a demo account that's too new to
  // qualify organically. Any other value (null / "none") means "no override".
  const overrideRaw = (profile.talent_badge_override as string | null) || null;
  const override: TalentBadgeKey | null =
    overrideRaw === "rising_talent" ||
    overrideRaw === "top_rated" ||
    overrideRaw === "top_rated_plus"
      ? overrideRaw
      : null;
  const badge = override ?? computed;

  // ---- Persist on the 15-day tick (and whenever the badge changed) ----------
  if (stale) {
    history.push({
      date: new Date().toISOString(),
      score: storedScore,
      badge,
    });
    history = history.slice(-12); // keep ~6 months of snapshots
  }
  if (stale || badge !== (profile.talent_badge ?? null)) {
    try {
      await admin
        .from("profiles")
        .update({
          jss_score: storedScore,
          jss_updated_at: updatedAt,
          jss_history: history,
          talent_badge: badge,
        })
        .eq("id", userId);
    } catch {
      /* columns may not exist pre-migration — page still renders live data */
    }
  }

  const nextJssUpdate = updatedAt
    ? new Date(
        new Date(updatedAt).getTime() + JSS_UPDATE_DAYS * 86400000
      ).toISOString()
    : null;

  return {
    inputs: { ...inputs, jssHistory: history },
    jssScore: storedScore,
    jssNeeded: jss.needed,
    jssUpdatedAt: updatedAt,
    nextJssUpdate,
    badge,
  };
}
