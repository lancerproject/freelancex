import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { VIOLATION_CATALOG, BADGE_META, type ViolationType, type HealthBadgeKey } from "@/lib/health";
import {
  adminAddViolation,
  adminResolveViolation,
  adminRecalcHealth,
} from "../health-actions";

export const metadata = { title: "Violations | Xwork Admin" };
export const dynamic = "force-dynamic";

function fmt(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminViolationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const admin = createAdminClient();

  // Recent violations across all users, with the freelancer's name/email.
  const { data: violationsRaw } = await admin
    .from("violations")
    .select("*")
    .order("recorded_at", { ascending: false })
    .limit(50);
  const violations = violationsRaw ?? [];

  const userIds = Array.from(new Set(violations.map((v) => v.user_id).filter(Boolean)));
  const nameById: Record<string, { name: string; email: string }> = {};
  if (userIds.length) {
    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of people ?? [])
      nameById[p.id] = { name: p.full_name || "User", email: p.email || "" };
  }

  // Lowest health scores (freelancers most at risk).
  const { data: worstRaw } = await admin
    .from("profiles")
    .select("id, full_name, email, health_score, health_badge")
    .eq("role", "freelancer")
    .not("health_score", "is", null)
    .order("health_score", { ascending: true })
    .limit(10);
  const worst = worstRaw ?? [];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Violations</h1>
            <p className="text-muted-foreground mt-1">
              Record, review and resolve account-health violations.
            </p>
          </div>
          <Link href="/admin" className="text-primary hover:underline text-sm">
            ← Trust &amp; Safety
          </Link>
        </div>

        {sp.ok && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-700 p-3 text-sm">
            {sp.ok}
          </div>
        )}
        {sp.err && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            {sp.err}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Add a violation */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Add a violation
            </h2>
            <form action={adminAddViolation} className="space-y-3">
              <input
                type="email"
                name="email"
                required
                placeholder="Freelancer's email"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
              />
              <select
                name="type"
                required
                defaultValue=""
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
              >
                <option value="" disabled>
                  Violation type…
                </option>
                {Object.entries(VIOLATION_CATALOG)
                  .filter(([k]) => k !== "identity_not_verified") // computed automatically
                  .map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label} (−{cat.points} pts · {cat.severity})
                    </option>
                  ))}
              </select>
              <input
                type="number"
                name="points"
                min={1}
                max={100}
                placeholder="Points override (optional — default shown above)"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
              />
              <textarea
                name="description"
                rows={2}
                placeholder="Description shown to the freelancer (optional)"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90"
              >
                Record violation
              </button>
            </form>
          </div>

          {/* Lowest scores + manual recalc */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Lowest health scores
            </h2>
            {worst.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No freelancers have a stored score yet.
              </p>
            ) : (
              <div className="space-y-2">
                {worst.map((p) => {
                  const meta = BADGE_META[(p.health_badge ?? "excellent") as HealthBadgeKey] ?? BADGE_META.excellent;
                  return (
                    <p key={p.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground truncate">
                        {p.full_name || p.email}
                      </span>
                      <span className={`shrink-0 font-semibold ${meta.text}`}>
                        {meta.emoji} {Number(p.health_score)}%
                      </span>
                    </p>
                  );
                })}
              </div>
            )}
            <form action={adminRecalcHealth} className="mt-5 flex gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="Recalculate by email…"
                className="flex-1 border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary shrink-0"
              >
                Recalculate
              </button>
            </form>
          </div>
        </div>

        {/* Recent violations */}
        <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">
          Recent violations
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {violations.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              No violations recorded yet.
            </p>
          )}
          {violations.map((v) => {
            const cat = VIOLATION_CATALOG[v.violation_type as ViolationType];
            const who = nameById[v.user_id];
            const active = v.status === "active" || v.status === "under_review";
            return (
              <div key={v.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-sm font-medium text-foreground">
                    {cat?.label ?? v.violation_type}{" "}
                    <span className="text-red-600">
                      −{Number(v.points_deducted) || cat?.points || 0} pts
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {who ? `${who.name} · ${who.email} · ` : ""}
                    {fmt(v.recorded_at)}
                    {v.status === "resolved" && v.resolved_at
                      ? ` · resolved ${fmt(v.resolved_at)}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    active
                      ? "bg-red-500/10 text-red-600"
                      : "bg-green-500/10 text-green-600"
                  }`}
                >
                  {active ? (v.status === "under_review" ? "Under review" : "Active") : "Resolved"}
                </span>
                {active && (
                  <form action={adminResolveViolation.bind(null, v.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Resolve
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
