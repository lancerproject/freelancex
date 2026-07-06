// Xwork talent badges — Rising Talent, Top Rated, Top Rated Plus.
// Original Xwork tiers and copy (not Upwork's), computed purely from
// on-platform performance. A freelancer holds at most ONE badge — the
// strongest tier they qualify for. Eligibility is re-checked every 15 days
// together with the Job Success Score snapshot.
//
// Policy note: directing payments off-platform (or similar violations) costs
// the badge — set profiles.badge_ban_until = now() + 6 months and no badge can
// be earned until that date passes.
//
// Plain module (no "use server") so both client and server can import it.

export type TalentBadgeKey = "rising_talent" | "top_rated" | "top_rated_plus";

export type CheckItem = { label: string; met: boolean };

export type BadgeEligibility = {
  key: TalentBadgeKey;
  eligible: boolean;
  checks: CheckItem[];
};

// Everything the criteria need, gathered by lib/stats-refresh.ts.
export type BadgeInputs = {
  avgRating: number; // average star rating (0 if none)
  ratingCount: number;
  hasNegativeReview12mo: boolean; // any ≤2★ review in the past 12 months
  earned12mo: number; // gross earnings, past 12 months (job_payments)
  profilePercent: number; // profile completeness 0–100
  activeLast90d: boolean; // proposal, milestone or sign-in in past 90 days
  jssScore: number | null; // current stored JSS (null = not yet earned)
  jssHistory: { date: string; score: number | null; badge: string | null }[];
  goodStanding: boolean; // account active, not suspended/flagged
  idVerified: boolean;
  hasPayoutMethod: boolean;
  firstContractAt: string | null; // ISO date of oldest contract
  availabilitySet: boolean; // availability badge on
  largeContract12mo: boolean; // ≥$1,000 released on one contract, no negative outcome
  badgeBanUntil: string | null; // policy penalty — no badges until this date
};

export const RISING_MIN_RATING = 4.8;
export const RISING_MIN_EARNED = 250;
export const TOP_RATED_MIN_EARNED = 1000;
export const TOP_RATED_PLUS_MIN_EARNED = 10000;
export const MIN_JSS = 90;
export const LARGE_CONTRACT_MIN = 1000;
export const JSS_UPDATE_DAYS = 15;

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

// "Held a strong score consistently": of the last 8 fortnightly snapshots
// (≈ 4 months), at least 7 must be ≥90 or carry a badge. Freelancers with a
// shorter history need every snapshot they do have to qualify.
function heldStrongScore(i: BadgeInputs): boolean {
  const snaps = (i.jssHistory ?? []).slice(-8);
  if (snaps.length === 0) return i.jssScore != null && i.jssScore >= MIN_JSS;
  const strong = snaps.filter(
    (s) => (s.score != null && s.score >= MIN_JSS) || !!s.badge
  ).length;
  return strong >= Math.min(7, snaps.length);
}

export function badgeBanned(i: BadgeInputs): boolean {
  return !!i.badgeBanUntil && new Date(i.badgeBanUntil).getTime() > Date.now();
}

export function risingTalentChecks(i: BadgeInputs): BadgeEligibility {
  const checks: CheckItem[] = [
    {
      label: `Average rating of ${RISING_MIN_RATING}★ or higher and $${RISING_MIN_EARNED}+ earned in the past 12 months`,
      met:
        i.ratingCount > 0 &&
        i.avgRating >= RISING_MIN_RATING &&
        i.earned12mo >= RISING_MIN_EARNED,
    },
    { label: "100% complete profile", met: i.profilePercent >= 100 },
    {
      label: "Active in the past 90 days (proposal, work, or sign-in)",
      met: i.activeLast90d,
    },
    {
      label: `Job Success Score of ${MIN_JSS}%+ (if you've earned one)`,
      met: i.jssScore == null || i.jssScore >= MIN_JSS,
    },
    { label: "Account in good standing", met: i.goodStanding && !badgeBanned(i) },
    { label: "No negative client feedback", met: !i.hasNegativeReview12mo },
    { label: "Identity verified", met: i.idVerified },
    { label: "A withdrawal method added", met: i.hasPayoutMethod },
  ];
  return {
    key: "rising_talent",
    eligible: checks.every((c) => c.met),
    checks,
  };
}

export function topRatedChecks(i: BadgeInputs): BadgeEligibility {
  const checks: CheckItem[] = [
    {
      label: `Job Success Score of ${MIN_JSS}% or higher`,
      met: i.jssScore != null && i.jssScore >= MIN_JSS,
    },
    {
      label: "First contract more than 90 days ago",
      met: daysSince(i.firstContractAt) > 90,
    },
    {
      label: "Kept a strong score across recent score updates",
      met: heldStrongScore(i),
    },
    { label: "100% complete profile", met: i.profilePercent >= 100 },
    {
      label: `$${TOP_RATED_MIN_EARNED.toLocaleString()}+ earned in the past 12 months`,
      met: i.earned12mo >= TOP_RATED_MIN_EARNED,
    },
    { label: "Availability badge turned on", met: i.availabilitySet },
    { label: "Account in good standing", met: i.goodStanding && !badgeBanned(i) },
    {
      label: "Active in the past 90 days (proposal, work, or sign-in)",
      met: i.activeLast90d,
    },
  ];
  return { key: "top_rated", eligible: checks.every((c) => c.met), checks };
}

export function topRatedPlusChecks(i: BadgeInputs): BadgeEligibility {
  const base = topRatedChecks(i);
  const checks: CheckItem[] = [
    { label: "Meets every Top Rated requirement", met: base.eligible },
    {
      label: `$${TOP_RATED_PLUS_MIN_EARNED.toLocaleString()}+ earned in the past 12 months`,
      met: i.earned12mo >= TOP_RATED_PLUS_MIN_EARNED,
    },
    {
      label: `A large contract ($${LARGE_CONTRACT_MIN.toLocaleString()}+) in the past 12 months with no negative outcome`,
      met: i.largeContract12mo,
    },
  ];
  return {
    key: "top_rated_plus",
    eligible: checks.every((c) => c.met),
    checks,
  };
}

// The badge a freelancer holds right now — strongest tier first.
export function computeTalentBadge(i: BadgeInputs): TalentBadgeKey | null {
  if (badgeBanned(i)) return null;
  if (topRatedPlusChecks(i).eligible) return "top_rated_plus";
  if (topRatedChecks(i).eligible) return "top_rated";
  if (risingTalentChecks(i).eligible) return "rising_talent";
  return null;
}

// Display metadata for a stored badge value.
export function talentBadgeMeta(badge: string | null | undefined): {
  key: TalentBadgeKey;
  label: string;
  icon: string;
  className: string;
  title: string;
} | null {
  switch (badge) {
    case "rising_talent":
      return {
        key: "rising_talent",
        label: "Rising Talent",
        icon: "🌱",
        className: "bg-amber-500/10 text-amber-600",
        title: "One of the most promising new freelancers on Xwork",
      };
    case "top_rated":
      return {
        key: "top_rated",
        label: "Top Rated",
        icon: "🏆",
        className: "bg-primary/10 text-primary",
        title:
          "Consistently excellent client feedback — among the top freelancers on Xwork",
      };
    case "top_rated_plus":
      return {
        key: "top_rated_plus",
        label: "Top Rated Plus",
        icon: "💎",
        className: "bg-primary/15 text-primary border border-primary/30",
        title:
          "Proven success on large contracts — the very top tier of Xwork talent",
      };
    default:
      return null;
  }
}
