// Account Health — score, badge, and violation catalog.
//
// The score (0–100) is driven ONLY by real violations, policy breaches, bad
// reviews and positive boosts. Profile completion NEVER affects it. All
// calculation happens here on the server; the client only displays results.
//
// computeHealth() is a pure function (unit-tested); recalcHealth() is the
// service that gathers live data, persists the score and logs every change.

import { createAdminClient } from "./supabase-admin";
import { getMembership } from "./membership";

export type Severity = "critical" | "high" | "medium" | "low";
export type HealthBadgeKey =
  | "excellent"
  | "good"
  | "risk"
  | "high_risk"
  | "restricted";

export type ViolationType =
  | "vpn_detected"
  | "country_mismatch"
  | "suspicious_ip"
  | "multiple_accounts_ip"
  | "disposable_email"
  | "bot_behavior"
  | "device_mismatch"
  | "admin_suspension"
  | "identity_failed_3x"
  | "identity_not_verified"
  | "payment_dispute"
  | "client_report"
  | "proposal_spam"
  | "job_cancelled"
  | "late_delivery"
  | "abusive_language"
  | "contact_info_shared"
  | "fake_portfolio"
  | "soliciting_outside_platform";

type CatalogEntry = {
  label: string;
  points: number; // deducted
  severity: Severity;
  section: "security" | "policy";
  description: string;
  action: { label: string; href: string };
  // Singleton types never stack — one active row at a time (e.g. VPN).
  singleton: boolean;
  // Per-type cap on TOTAL deduction (for stackable types).
  cap?: number;
};

const SUPPORT = { label: "Contact Support", href: "/help" };

export const VIOLATION_CATALOG: Record<ViolationType, CatalogEntry> = {
  vpn_detected: {
    label: "VPN / Proxy Usage Detected",
    points: 40,
    severity: "critical",
    section: "security",
    description:
      "Our system detected a sign-in through a VPN, proxy or Tor network. Masking your location violates Xwork's Terms of Service.",
    action: SUPPORT,
    singleton: true,
  },
  country_mismatch: {
    label: "Country Mismatch on Identity Verification",
    points: 35,
    severity: "critical",
    section: "security",
    description:
      "The country on your identity document doesn't match your profile country. Accounts must represent their real location.",
    action: SUPPORT,
    singleton: true,
  },
  suspicious_ip: {
    label: "Suspicious / Spam IP Detected",
    points: 30,
    severity: "critical",
    section: "security",
    description:
      "A sign-in came from an IP address known for spam or abuse. This puts your account at high risk.",
    action: SUPPORT,
    singleton: true,
  },
  multiple_accounts_ip: {
    label: "Multiple Accounts From the Same Network",
    points: 20,
    severity: "high",
    section: "security",
    description:
      "Several Xwork accounts were created or used from your network. Each person may hold only one account.",
    action: SUPPORT,
    singleton: true,
  },
  disposable_email: {
    label: "Disposable / Temporary Email Used",
    points: 15,
    severity: "high",
    section: "security",
    description:
      "Your account used a temporary email service. A permanent, reachable email is required.",
    action: { label: "Update Email", href: "/settings/contact" },
    singleton: true,
  },
  bot_behavior: {
    label: "Automated (Bot-Like) Behavior Detected",
    points: 10,
    severity: "medium",
    section: "security",
    description:
      "Actions were submitted faster than a human could complete them, which looks like automation or scripting.",
    action: SUPPORT,
    singleton: true,
  },
  device_mismatch: {
    label: "Device Mismatch on Verification",
    points: 10,
    severity: "medium",
    section: "security",
    description:
      "The device used during identity verification didn't match the one on file for your account.",
    action: SUPPORT,
    singleton: true,
  },
  admin_suspension: {
    label: "Account Suspended by Xwork",
    points: 50,
    severity: "critical",
    section: "policy",
    description:
      "Your account was suspended by the Xwork team for violating our Terms of Service.",
    action: SUPPORT,
    singleton: true,
  },
  identity_failed_3x: {
    label: "Identity Verification Failed Repeatedly",
    points: 25,
    severity: "high",
    section: "policy",
    description:
      "Identity verification failed three or more times. Repeated failures suggest the documents don't match the account holder.",
    action: { label: "Verify Now", href: "/settings/identity" },
    singleton: true,
  },
  identity_not_verified: {
    label: "Identity Not Verified",
    points: 20,
    severity: "high",
    section: "policy",
    description:
      "Your identity hasn't been verified yet. Verified accounts are safer for clients and score higher.",
    action: { label: "Verify Now", href: "/settings/identity" },
    singleton: true,
  },
  payment_dispute: {
    label: "Payment Dispute Opened Against You",
    points: 20,
    severity: "high",
    section: "policy",
    description:
      "A client opened a payment dispute on one of your contracts. Resolve it in the contract's dispute flow.",
    action: SUPPORT,
    singleton: false,
  },
  client_report: {
    label: "Report Filed by a Client",
    points: 15,
    severity: "high",
    section: "policy",
    description:
      "A client reported your account to our Trust & Safety team, and the report was upheld.",
    action: SUPPORT,
    singleton: false,
  },
  proposal_spam: {
    label: "Proposal Flagged as Spam",
    points: 10,
    severity: "medium",
    section: "policy",
    description:
      "A client flagged one of your proposals as spam. Send tailored proposals only to jobs that match your skills.",
    action: SUPPORT,
    singleton: false,
  },
  job_cancelled: {
    label: "Job Cancelled by You",
    points: 5,
    severity: "low",
    section: "policy",
    description:
      "You cancelled a job after being hired. Frequent cancellations hurt client trust.",
    action: SUPPORT,
    singleton: false,
    cap: 20,
  },
  late_delivery: {
    label: "Late Delivery Reported",
    points: 5,
    severity: "low",
    section: "policy",
    description:
      "A client reported that work was delivered after the agreed deadline.",
    action: SUPPORT,
    singleton: false,
    cap: 15,
  },
  abusive_language: {
    label: "Abusive Language in Messages",
    points: 15,
    severity: "high",
    section: "policy",
    description:
      "Abusive or threatening language was detected in your messages. Treat everyone on Xwork professionally.",
    action: SUPPORT,
    singleton: false,
  },
  contact_info_shared: {
    label: "Contact Info Shared Outside Xwork",
    points: 20,
    severity: "high",
    section: "policy",
    description:
      "A phone number, email or messaging handle was shared in chat before a contract. Keep communication on Xwork.",
    action: { label: "Read Policy", href: "/terms" },
    singleton: false,
  },
  fake_portfolio: {
    label: "Fake or Plagiarized Portfolio Work",
    points: 25,
    severity: "critical",
    section: "policy",
    description:
      "Portfolio work on your profile was found to be copied or misrepresented as your own.",
    action: SUPPORT,
    singleton: true,
  },
  soliciting_outside_platform: {
    label: "Soliciting Payment Outside Xwork",
    points: 30,
    severity: "critical",
    section: "policy",
    description:
      "You asked for or accepted payment outside Xwork's payment system. This is strictly against our Terms of Service.",
    action: { label: "Read Policy", href: "/terms" },
    singleton: true,
  },
};

export const REVIEW_DEDUCTIONS: Record<number, number> = { 1: 8, 2: 5, 3: 2 };
export const REVIEW_CAP = 30;
export const BOOST_FIVE_STAR = 2; // per review
export const BOOST_FIVE_STAR_MAX = 10;
export const BOOST_JOB = 1; // per completed job
export const BOOST_JOB_MAX = 5;
export const BOOST_IDENTITY = 10;
export const BOOST_PRO = 5;
export const BOOST_CLEAN_90D = 5;
export const SUSPENDED_CAP = 19;

export const BADGE_META: Record<
  HealthBadgeKey,
  { label: string; emoji: string; min: number; ring: string; text: string; bg: string; description: string }
> = {
  excellent: {
    label: "Excellent",
    emoji: "🟢",
    min: 85,
    ring: "stroke-green-500",
    text: "text-green-600",
    bg: "bg-green-500/10",
    description: "Your account is in great standing. Keep it up!",
  },
  good: {
    label: "Good",
    emoji: "🔵",
    min: 65,
    ring: "stroke-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-500/10",
    description: "Your account is in good shape with minor issues.",
  },
  risk: {
    label: "Risk",
    emoji: "🟡",
    min: 45,
    ring: "stroke-yellow-500",
    text: "text-yellow-600",
    bg: "bg-yellow-500/10",
    description:
      "Your account has policy violations. Take action to avoid restrictions.",
  },
  high_risk: {
    label: "High Risk",
    emoji: "🟠",
    min: 20,
    ring: "stroke-orange-500",
    text: "text-orange-600",
    bg: "bg-orange-500/10",
    description:
      "Serious violations detected. Resolve them immediately to avoid account restriction.",
  },
  restricted: {
    label: "Restricted",
    emoji: "🔴",
    min: 0,
    ring: "stroke-red-500",
    text: "text-red-600",
    bg: "bg-red-500/10",
    description:
      "Your account has been restricted due to serious violations. Contact support to appeal.",
  },
};

export function badgeForScore(score: number): HealthBadgeKey {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "risk";
  if (score >= 20) return "high_risk";
  return "restricted";
}

// ---------------------------------------------------------------------------
// Pure score computation (unit-tested — no I/O).
// ---------------------------------------------------------------------------

export type ViolationRow = {
  id: string;
  violation_type: string;
  severity: string;
  points_deducted: number;
  description: string | null;
  status: string;
  recorded_at: string | null;
  resolved_at: string | null;
  metadata?: unknown;
};

export type HealthInputs = {
  activeViolations: ViolationRow[]; // status = active | under_review
  allViolationDates: string[]; // recorded_at of EVERY violation (any status)
  reviewRatings: number[]; // all client star ratings (1–5)
  completedJobs: number;
  idVerified: boolean;
  isPro: boolean;
  accountStatus: string | null; // profiles.account_status
};

export type HealthBreakdown = {
  score: number;
  badge: HealthBadgeKey;
  // Grouped deduction line items (what the page renders).
  securityItems: { type: string; label: string; points: number; count: number; date: string | null }[];
  policyItems: { type: string; label: string; points: number; count: number; date: string | null }[];
  reviewItems: { rating: number; count: number; points: number }[];
  boostItems: { label: string; points: number }[];
  securityTotal: number;
  policyTotal: number;
  reviewTotal: number;
  boostTotal: number;
  suspended: boolean;
  permanentlySuspended: boolean;
};

export function computeHealth(i: HealthInputs): HealthBreakdown {
  const permanentlySuspended = i.accountStatus === "permanently_suspended";
  const suspended = i.accountStatus === "suspended";

  // ---- Violation deductions, grouped per type with per-type caps ----------
  const perType: Record<string, { points: number; count: number; date: string | null }> = {};
  for (const v of i.activeViolations) {
    const cat = VIOLATION_CATALOG[v.violation_type as ViolationType];
    const pts = Number(v.points_deducted) || cat?.points || 0;
    const t = (perType[v.violation_type] ??= { points: 0, count: 0, date: null });
    t.points += pts;
    t.count += 1;
    if (!t.date || (v.recorded_at && v.recorded_at > t.date)) t.date = v.recorded_at;
  }
  // Virtual violation: identity not verified (never stored — computed live so
  // it disappears the moment verification completes).
  if (!i.idVerified && !perType["identity_not_verified"]) {
    perType["identity_not_verified"] = {
      points: VIOLATION_CATALOG.identity_not_verified.points,
      count: 1,
      date: null,
    };
  }
  // Apply per-type caps.
  for (const [type, t] of Object.entries(perType)) {
    const cap = VIOLATION_CATALOG[type as ViolationType]?.cap;
    if (cap != null) t.points = Math.min(t.points, cap);
  }

  const securityItems: HealthBreakdown["securityItems"] = [];
  const policyItems: HealthBreakdown["policyItems"] = [];
  for (const [type, t] of Object.entries(perType)) {
    const cat = VIOLATION_CATALOG[type as ViolationType];
    const item = {
      type,
      label: cat?.label ?? type,
      points: t.points,
      count: t.count,
      date: t.date,
    };
    if (cat?.section === "security") securityItems.push(item);
    else policyItems.push(item);
  }
  const securityTotal = securityItems.reduce((s, x) => s + x.points, 0);
  const policyTotal = policyItems.reduce((s, x) => s + x.points, 0);

  // ---- Review deductions (own section, capped) ------------------------------
  const reviewItems: HealthBreakdown["reviewItems"] = [];
  let reviewTotal = 0;
  for (const star of [1, 2, 3]) {
    const count = i.reviewRatings.filter((r) => Math.round(r) === star).length;
    if (count > 0) {
      const pts = count * REVIEW_DEDUCTIONS[star];
      reviewItems.push({ rating: star, count, points: pts });
      reviewTotal += pts;
    }
  }
  reviewTotal = Math.min(reviewTotal, REVIEW_CAP);

  // ---- Boosts (paused entirely while suspended) ------------------------------
  const boostItems: HealthBreakdown["boostItems"] = [];
  let boostTotal = 0;
  if (!suspended && !permanentlySuspended) {
    if (i.idVerified) boostItems.push({ label: "Identity verified", points: BOOST_IDENTITY });
    const fiveStars = i.reviewRatings.filter((r) => Math.round(r) === 5).length;
    if (fiveStars > 0)
      boostItems.push({
        label: `5-star reviews × ${fiveStars}`,
        points: Math.min(fiveStars * BOOST_FIVE_STAR, BOOST_FIVE_STAR_MAX),
      });
    if (i.completedJobs > 0)
      boostItems.push({
        label: `Jobs completed successfully × ${i.completedJobs}`,
        points: Math.min(i.completedJobs * BOOST_JOB, BOOST_JOB_MAX),
      });
    if (i.isPro) boostItems.push({ label: "Pro membership active", points: BOOST_PRO });
    const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const recent = i.allViolationDates.some((d) => d && d >= ninetyAgo);
    if (!recent)
      boostItems.push({ label: "No violations in the last 90 days", points: BOOST_CLEAN_90D });
    boostTotal = boostItems.reduce((s, x) => s + x.points, 0);
  }

  // ---- Final score with hard caps -------------------------------------------
  let score = Math.max(
    0,
    Math.min(100, 100 - securityTotal - policyTotal - reviewTotal + boostTotal)
  );
  if (permanentlySuspended) score = 0;
  else if (suspended) score = Math.min(score, SUSPENDED_CAP);

  return {
    score,
    badge: badgeForScore(score),
    securityItems,
    policyItems,
    reviewItems,
    boostItems,
    securityTotal,
    policyTotal,
    reviewTotal: Math.min(reviewTotal, REVIEW_CAP),
    boostTotal,
    suspended,
    permanentlySuspended,
  };
}

// ---------------------------------------------------------------------------
// Service: gather live data, persist score + badge, log every change.
// ---------------------------------------------------------------------------

export type HealthResult = HealthBreakdown & {
  activeViolations: ViolationRow[];
  resolvedViolations: ViolationRow[];
  reviewList: { rating: number; created_at: string | null }[];
  lastUpdated: string;
};

export async function recalcHealth(
  userId: string,
  trigger: string
): Promise<HealthResult | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.role !== "freelancer") return null;

  const [{ data: viols }, { data: reviews }, { count: completed }] =
    await Promise.all([
      admin
        .from("violations")
        .select("*")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false }),
      admin.from("reviews").select("rating, created_at").eq("reviewee_id", userId),
      admin
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("freelancer_id", userId)
        .eq("status", "completed"),
    ]);

  const all = (viols ?? []) as ViolationRow[];
  const active = all.filter(
    (v) => v.status === "active" || v.status === "under_review"
  );
  const resolved = all.filter((v) => v.status === "resolved");
  const reviewList = (reviews ?? []).map((r) => ({
    rating: Number(r.rating) || 0,
    created_at: r.created_at ?? null,
  }));

  const breakdown = computeHealth({
    activeViolations: active,
    allViolationDates: all.map((v) => v.recorded_at ?? ""),
    reviewRatings: reviewList.map((r) => r.rating),
    completedJobs: completed ?? 0,
    idVerified: !!profile.id_verified,
    isPro: getMembership(profile).isPro,
    accountStatus: profile.account_status ?? "active",
  });

  const now = new Date().toISOString();
  const oldScore =
    profile.health_score != null ? Number(profile.health_score) : null;
  const oldBadge = profile.health_badge ?? null;

  // Persist + log only on actual change (every change IS logged).
  if (oldScore !== breakdown.score || oldBadge !== breakdown.badge) {
    try {
      await admin
        .from("profiles")
        .update({
          health_score: breakdown.score,
          health_badge: breakdown.badge,
          health_last_updated: now,
        })
        .eq("id", userId);
      await admin.from("health_score_log").insert({
        user_id: userId,
        old_score: oldScore,
        new_score: breakdown.score,
        old_badge: oldBadge,
        new_badge: breakdown.badge,
        trigger_event: trigger,
      });
    } catch {
      /* pre-migration: page still renders the live breakdown */
    }
  } else {
    try {
      await admin
        .from("profiles")
        .update({ health_last_updated: now })
        .eq("id", userId);
    } catch {
      /* ignore */
    }
  }

  return {
    ...breakdown,
    activeViolations: active,
    resolvedViolations: resolved,
    reviewList,
    lastUpdated: now,
  };
}

// Record a violation (deduped for singleton types) and recalculate. This is
// the ONE entry point the security system, actions and admin all use.
export async function addViolation(params: {
  userId: string;
  type: ViolationType;
  description?: string;
  metadata?: Record<string, unknown>;
  points?: number; // admin override
  severity?: Severity; // admin override
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const cat = VIOLATION_CATALOG[params.type];
  if (!cat) return { ok: false };
  const admin = createAdminClient();

  try {
    if (cat.singleton) {
      const { data: existing } = await admin
        .from("violations")
        .select("id")
        .eq("user_id", params.userId)
        .eq("violation_type", params.type)
        .in("status", ["active", "under_review"])
        .limit(1);
      if (existing && existing.length > 0) return { ok: true, skipped: true };
    }
    await admin.from("violations").insert({
      user_id: params.userId,
      violation_type: params.type,
      severity: params.severity ?? cat.severity,
      points_deducted: params.points ?? cat.points,
      description: params.description ?? cat.description,
      status: "active",
      metadata: params.metadata ?? null,
    });
  } catch {
    return { ok: false };
  }
  await recalcHealth(params.userId, `violation:${params.type}`);
  return { ok: true };
}

// Resolve a violation (admin) and recalculate immediately.
export async function resolveViolation(
  violationId: string,
  adminId: string
): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  const { data: v } = await admin
    .from("violations")
    .select("id, user_id")
    .eq("id", violationId)
    .maybeSingle();
  if (!v) return { ok: false };
  await admin
    .from("violations")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq("id", violationId);
  await recalcHealth(v.user_id, "violation_resolved");
  return { ok: true };
}
