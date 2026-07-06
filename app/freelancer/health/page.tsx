import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  recalcHealth,
  BADGE_META,
  VIOLATION_CATALOG,
  BOOST_IDENTITY,
  BOOST_PRO,
  BOOST_CLEAN_90D,
  type ViolationType,
  type ViolationRow,
} from "@/lib/health";
import { getMembership } from "@/lib/membership";

export const metadata = { title: "Account Health | Xwork" };

// The health score is recalculated live on every visit (and on every trigger
// elsewhere), so this page must never be served from a static cache.
export const dynamic = "force-dynamic";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SEVERITY_PILL: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600",
  high: "bg-orange-500/10 text-orange-600",
  medium: "bg-yellow-500/10 text-yellow-600",
  low: "bg-secondary text-muted-foreground",
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-red-500/10 text-red-600" },
  under_review: { label: "Under Review", cls: "bg-yellow-500/10 text-yellow-600" },
  resolved: { label: "Resolved", cls: "bg-green-500/10 text-green-600" },
};

export default async function HealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Core columns only — this select must NEVER include recently-migrated
  // columns. A Supabase select fails as a whole if ONE column is missing, and
  // a failed select here would bounce the freelancer to the dashboard.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, id_verified, account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "freelancer") redirect("/dashboard");

  // Newer columns are selected separately and are allowed to fail quietly if
  // their migration hasn't been applied yet — the page still renders.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let membershipProfile: any = null;
  {
    const { data } = await supabase
      .from("profiles")
      .select(
        "plan, membership_status, membership_end_date, membership_autorenew"
      )
      .eq("id", user.id)
      .maybeSingle();
    membershipProfile = data;
  }

  // Score at the user's LAST visit (for the improved/dropped banner), captured
  // before this visit's recalculation.
  let previousVisitScore: number | null = null;
  {
    const { data } = await supabase
      .from("profiles")
      .select("health_previous_score")
      .eq("id", user.id)
      .maybeSingle();
    previousVisitScore =
      data?.health_previous_score != null
        ? Number(data.health_previous_score)
        : null;
  }

  // Real-time: recalculate from live violations/reviews/boosts right now.
  const health = await recalcHealth(user.id, "page_view");
  if (!health) redirect("/dashboard");

  // Remember this visit's score for next time (best-effort; pre-migration safe).
  try {
    await createAdminClient()
      .from("profiles")
      .update({ health_previous_score: health.score })
      .eq("id", user.id);
  } catch {
    /* ignore */
  }

  const delta =
    previousVisitScore != null ? health.score - previousVisitScore : 0;
  const meta = BADGE_META[health.badge];
  const isPro = getMembership(membershipProfile).isPro;
  const idVerified = !!profile?.id_verified;
  const restricted = health.badge === "restricted";

  // The "identity not verified" virtual violation renders in the active list
  // alongside stored rows, so build one combined list for Section 3.
  type ActiveItem = {
    key: string;
    type: string;
    label: string;
    severity: string;
    points: number;
    date: string | null;
    status: string;
    description: string;
    action: { label: string; href: string };
  };
  const activeItems: ActiveItem[] = health.activeViolations.map((v) => {
    const cat = VIOLATION_CATALOG[v.violation_type as ViolationType];
    return {
      key: v.id,
      type: v.violation_type,
      label: cat?.label ?? v.violation_type,
      severity: v.severity || cat?.severity || "medium",
      points: Number(v.points_deducted) || cat?.points || 0,
      date: v.recorded_at,
      status: v.status,
      description: v.description || cat?.description || "",
      action: cat?.action ?? { label: "Contact Support", href: "/help" },
    };
  });
  if (!idVerified) {
    const cat = VIOLATION_CATALOG.identity_not_verified;
    activeItems.push({
      key: "virtual-identity",
      type: "identity_not_verified",
      label: cat.label,
      severity: cat.severity,
      points: cat.points,
      date: null,
      status: "active",
      description: cat.description,
      action: cat.action,
    });
  }
  activeItems.sort((a, b) => b.points - a.points);

  // ---- Section 6: dynamic tips (violations + score factors ONLY) -----------
  const tips: { text: string; action?: { label: string; href: string } }[] = [];
  const seenTip = new Set<string>();
  for (const item of activeItems) {
    if (seenTip.has(item.type)) continue;
    seenTip.add(item.type);
    if (item.type === "identity_not_verified") {
      tips.push({
        text: `Complete identity verification to remove this violation and gain +${BOOST_IDENTITY} pts.`,
        action: { label: "Verify Now", href: "/settings/identity" },
      });
    } else if (item.type === "job_cancelled") {
      tips.push({
        text: "Finish the jobs you accept — completing contracts instead of cancelling reduces this deduction over time.",
      });
    } else if (item.type === "late_delivery") {
      tips.push({
        text: "Agree on realistic deadlines and deliver on time to avoid further late-delivery reports.",
      });
    } else {
      tips.push({
        text: `Resolve "${item.label}" (${item.points} pts) by contacting our support team.`,
        action: item.action,
      });
    }
  }
  if (idVerified === false && !seenTip.has("identity_not_verified")) {
    // (already covered above via the virtual violation)
  }
  if (!isPro && !health.suspended && !health.permanentlySuspended) {
    tips.push({
      text: `Upgrade to Pro to gain +${BOOST_PRO} pts.`,
      action: { label: "Upgrade", href: "/settings/membership" },
    });
  }
  // 90-day clean bonus: only if they DON'T already have it.
  const hasCleanBonus = health.boostItems.some((b) =>
    b.label.startsWith("No violations")
  );
  if (!hasCleanBonus) {
    const dates = health.activeViolations
      .concat(health.resolvedViolations)
      .map((v: ViolationRow) => v.recorded_at)
      .filter(Boolean) as string[];
    const latest = dates.sort().at(-1);
    if (latest) {
      const until = new Date(new Date(latest).getTime() + 90 * 86400000);
      tips.push({
        text: `Stay violation-free until ${fmtDate(until.toISOString())} to earn the 90-day clean-record bonus (+${BOOST_CLEAN_90D} pts).`,
      });
    }
  }

  // Ring geometry.
  const R = 52;
  const C = 2 * Math.PI * R;
  const ringOffset = C * (1 - health.score / 100);

  const badReviews = health.reviewList
    .filter((r) => Math.round(r.rating) <= 3 && Math.round(r.rating) >= 1)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        {/* Restricted banner — above everything else */}
        {restricted && (
          <div className="mb-6 rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-red-600 font-semibold text-base flex-1">
              🔴 Your account is restricted. Contact support immediately to
              appeal and restore your account.
            </p>
            <Link
              href="/help"
              className="inline-block bg-red-600 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-red-700 text-center shrink-0"
            >
              Contact Support
            </Link>
          </div>
        )}

        <h1 className="text-3xl font-bold text-foreground">Account health</h1>
        <p className="text-muted-foreground mt-1 mb-6">
          Your standing on Xwork, based on policy violations, client feedback
          and account activity — updated in real time.
        </p>

        {/* ---------------- Section 1 — Score overview ---------------- */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Ring */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  strokeWidth="10"
                  className="stroke-secondary"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={ringOffset}
                  className={meta.ring}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${meta.text}`}>
                  {health.score}%
                </span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${meta.bg} ${meta.text}`}
              >
                {meta.emoji} {meta.label}
              </span>
              <p className="text-foreground mt-2">{meta.description}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Score last updated: {fmtDateTime(health.lastUpdated)}
              </p>
              {delta > 0 && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  🟢 Your score improved by {delta} pts since your last visit.
                </p>
              )}
              {delta < 0 && (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  🔴 Your score dropped by {Math.abs(delta)} pts. See
                  violations below.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- Section 2 — Score breakdown ---------------- */}
        <h2 className="text-xl font-bold text-foreground mb-3">
          Score breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <details
            className="rounded-2xl border border-border bg-card p-5"
            open={health.securityItems.length > 0}
          >
            <summary className="cursor-pointer font-semibold text-foreground flex items-center justify-between">
              <span>Security violations</span>
              <span className={health.securityTotal > 0 ? "text-red-600" : "text-muted-foreground"}>
                −{health.securityTotal} pts
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              {health.securityItems.length === 0 && (
                <p className="text-muted-foreground">
                  No security violations affect your score.
                </p>
              )}
              {health.securityItems.map((it) => (
                <p key={it.type} className="flex justify-between gap-3 text-foreground">
                  <span>
                    ⚠ {it.label}
                    {it.count > 1 ? ` × ${it.count}` : ""}
                    {it.date ? (
                      <span className="text-muted-foreground"> ({fmtDate(it.date)})</span>
                    ) : null}
                  </span>
                  <span className="text-red-600 shrink-0">−{it.points} pts</span>
                </p>
              ))}
            </div>
          </details>

          <details
            className="rounded-2xl border border-border bg-card p-5"
            open={health.policyItems.length > 0}
          >
            <summary className="cursor-pointer font-semibold text-foreground flex items-center justify-between">
              <span>Policy violations</span>
              <span className={health.policyTotal > 0 ? "text-red-600" : "text-muted-foreground"}>
                −{health.policyTotal} pts
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              {health.policyItems.length === 0 && (
                <p className="text-muted-foreground">
                  No policy violations affect your score.
                </p>
              )}
              {health.policyItems.map((it) => (
                <p key={it.type} className="flex justify-between gap-3 text-foreground">
                  <span>
                    ⚠ {it.label}
                    {it.count > 1 ? ` × ${it.count}` : ""}
                    {it.date ? (
                      <span className="text-muted-foreground"> ({fmtDate(it.date)})</span>
                    ) : null}
                  </span>
                  <span className="text-red-600 shrink-0">−{it.points} pts</span>
                </p>
              ))}
            </div>
          </details>

          <details
            className="rounded-2xl border border-border bg-card p-5"
            open={health.reviewTotal > 0}
          >
            <summary className="cursor-pointer font-semibold text-foreground flex items-center justify-between">
              <span>Review impact</span>
              <span className={health.reviewTotal > 0 ? "text-red-600" : "text-muted-foreground"}>
                −{health.reviewTotal} pts
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              {health.reviewItems.length === 0 && (
                <p className="text-muted-foreground">
                  No bad reviews are affecting your score.
                </p>
              )}
              {health.reviewItems.map((it) => (
                <p key={it.rating} className="flex justify-between gap-3 text-foreground">
                  <span>
                    ★ {it.rating}-star review{it.count > 1 ? `s × ${it.count}` : ""}
                  </span>
                  <span className="text-red-600 shrink-0">−{it.points} pts</span>
                </p>
              ))}
              {health.reviewItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Review deductions are capped at −30 pts total.
                </p>
              )}
            </div>
          </details>

          <details
            className="rounded-2xl border border-border bg-card p-5"
            open={health.boostItems.length > 0}
          >
            <summary className="cursor-pointer font-semibold text-foreground flex items-center justify-between">
              <span>Positive boosts</span>
              <span className={health.boostTotal > 0 ? "text-green-600" : "text-muted-foreground"}>
                +{health.boostTotal} pts
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              {health.boostItems.length === 0 && (
                <p className="text-muted-foreground">
                  {health.suspended || health.permanentlySuspended
                    ? "Boosts are paused while your account is suspended."
                    : "No boosts apply yet."}
                </p>
              )}
              {health.boostItems.map((b) => (
                <p key={b.label} className="flex justify-between gap-3 text-foreground">
                  <span>
                    {b.label.startsWith("5-star") ? "⭐" : "✓"} {b.label}
                  </span>
                  <span className="text-green-600 shrink-0">+{b.points} pts</span>
                </p>
              ))}
            </div>
          </details>
        </div>

        {/* ---------------- Section 3 — Active violations ---------------- */}
        <h2 className="text-xl font-bold text-foreground mb-3">
          Active violations
        </h2>
        {activeItems.length === 0 ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 mb-8">
            <p className="text-green-700 font-medium">
              ✅ No active violations. Your account is in great standing!
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {activeItems.map((v) => (
              <div key={v.key} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground flex-1 min-w-[200px]">
                    {v.label}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_PILL[v.severity] ?? SEVERITY_PILL.medium}`}
                  >
                    {v.severity}
                  </span>
                  <span className="text-red-600 font-semibold text-sm">
                    −{v.points} pts
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${(STATUS_PILL[v.status] ?? STATUS_PILL.active).cls}`}
                  >
                    {(STATUS_PILL[v.status] ?? STATUS_PILL.active).label}
                  </span>
                </div>
                {v.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Recorded {fmtDate(v.date)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {v.description}
                </p>
                <Link
                  href={v.action.href}
                  className="inline-block mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-primary hover:bg-secondary"
                >
                  {v.action.label}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- Section 4 — Review impact ---------------- */}
        <h2 className="text-xl font-bold text-foreground mb-3">Review impact</h2>
        <div className="rounded-2xl border border-border bg-card p-5 mb-8">
          {health.reviewTotal === 0 ? (
            <p className="text-green-700 font-medium">
              ✅ No bad reviews are affecting your score.
            </p>
          ) : (
            <>
              <p className="text-foreground font-medium">
                Reviews are reducing your score by {health.reviewTotal} pts.
              </p>
              <div className="mt-3 space-y-2 text-sm">
                {badReviews.map((r, i) => {
                  const star = Math.round(r.rating);
                  const pts = star === 1 ? 8 : star === 2 ? 5 : 2;
                  return (
                    <p key={i} className="flex justify-between gap-3 text-foreground">
                      <span>
                        {"★".repeat(star)}
                        {"☆".repeat(5 - star)} {star}-star review
                        {r.created_at ? (
                          <span className="text-muted-foreground"> ({fmtDate(r.created_at)})</span>
                        ) : null}
                      </span>
                      <span className="text-red-600 shrink-0">−{pts} pts</span>
                    </p>
                  );
                })}
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            4-star and 5-star reviews do not reduce your score.
          </p>
        </div>

        {/* ---------------- Section 5 — Violation history ---------------- */}
        <details className="rounded-2xl border border-border bg-card p-5 mb-8">
          <summary className="cursor-pointer font-semibold text-foreground">
            Violation history ({health.resolvedViolations.length} resolved)
          </summary>
          {health.resolvedViolations.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">
              No past violations.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {health.resolvedViolations.map((v) => {
                const cat = VIOLATION_CATALOG[v.violation_type as ViolationType];
                return (
                  <div key={v.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-foreground flex-1 min-w-[200px]">
                        {cat?.label ?? v.violation_type}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        <s>−{Number(v.points_deducted) || cat?.points || 0} pts</s>{" "}
                        (resolved)
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✅ Resolved on {fmtDate(v.resolved_at)}
                    </p>
                    {v.recorded_at && (
                      <p className="text-xs text-muted-foreground">
                        Recorded {fmtDate(v.recorded_at)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </details>

        {/* ---------------- Section 6 — How to improve ---------------- */}
        {tips.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-3">
              How to improve your score
            </h2>
            <div className="rounded-2xl border border-border bg-card p-5 mb-8 space-y-3">
              {tips.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-foreground flex-1 min-w-[240px]">
                    • {t.text}
                  </p>
                  {t.action && (
                    <Link
                      href={t.action.href}
                      className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:opacity-90 shrink-0"
                    >
                      {t.action.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---------------- Section 7 — Appeal ---------------- */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            Believe a violation was added by mistake? Contact our support team
            to appeal.
          </p>
          <Link
            href="/help"
            className="inline-block rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-secondary text-center shrink-0"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
