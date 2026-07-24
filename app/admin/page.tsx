import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { WARNING_LIMIT } from "@/lib/moderation";
import {
  adminSuspendUser,
  adminReinstateUser,
  adminClearWarnings,
  adminResolveDispute,
} from "./actions";

export const metadata = { title: "Trust & Safety | Xwork Admin" };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  // Admins legitimately view other users' email — read profiles via the
  // service role since email is revoked from the authenticated role.
  const admin = createAdminClient();

  // Flagged accounts: anyone with warnings or a suspension.
  const { data: flaggedRaw } = await admin
    .from("profiles")
    .select("id, full_name, email, username, role, warnings, suspended, suspension_reason")
    .or("warnings.gt.0,suspended.eq.true")
    .order("suspended", { ascending: false })
    .order("warnings", { ascending: false });
  const flagged = flaggedRaw ?? [];

  // Open disputes.
  const { data: disputesRaw } = await supabase
    .from("contracts")
    .select("id, title, dispute_reason, disputed_at, client_id, freelancer_id")
    .eq("status", "disputed")
    .order("disputed_at", { ascending: false });
  const disputes = disputesRaw ?? [];

  // Resolve party names for the dispute list.
  const partyIds = Array.from(
    new Set(disputes.flatMap((d) => [d.client_id, d.freelancer_id]).filter(Boolean))
  );
  const nameById: Record<string, string> = {};
  if (partyIds.length) {
    const { data: parties } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", partyIds);
    for (const p of parties ?? [])
      nameById[p.id] = p.full_name || p.email || "User";
  }

  // Headline counts.
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const { count: reportedJobs } = await admin
    .from("job_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const suspendedCount = flagged.filter((f) => f.suspended).length;

  const stats = [
    { label: "Total users", value: totalUsers ?? 0 },
    { label: "Flagged accounts", value: flagged.length },
    { label: "Open disputes", value: disputes.length },
    { label: "Reported jobs", value: reportedJobs ?? 0 },
  ];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Trust &amp; Safety</h1>
        <p className="text-muted-foreground mt-1 mb-4">
          Review flagged accounts, manage suspensions, and resolve disputes.
        </p>
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Link
            href="/admin/analytics"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            📊 Analytics
          </Link>
          <Link
            href="/admin/support"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            💬 Support &amp; disputes
          </Link>
          <Link
            href="/admin/identity"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            🪪 Identity reviews
          </Link>
          <Link
            href="/admin/violations"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            ⚖️ Violations
          </Link>
          <Link
            href="/admin/users"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            👥 Users
          </Link>
          <Link
            href="/admin/jobs"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            🧹 Job moderation
          </Link>
          <Link
            href="/admin/messages"
            className="border border-border text-foreground rounded-full px-4 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            💬 Chat rooms
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Flagged accounts */}
        <h2 className="text-xl font-bold text-foreground mb-3">
          Flagged accounts
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border mb-10">
          {flagged.length === 0 ? (
            <p className="p-6 text-muted-foreground">
              No flagged accounts. All clear. 🎉
            </p>
          ) : (
            flagged.map((u) => (
              <div key={u.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${u.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {u.full_name || u.username || u.email || "User"}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {u.email} · {u.role || "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {u.suspended ? (
                        <span className="text-xs rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 font-medium">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-xs rounded-full bg-amber-500/10 text-amber-600 px-2 py-0.5 font-medium">
                          {u.warnings} / {WARNING_LIMIT} warnings
                        </span>
                      )}
                      {u.suspension_reason && (
                        <span className="text-xs text-muted-foreground">
                          {u.suspension_reason}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {u.suspended ? (
                      <form action={adminReinstateUser.bind(null, u.id)}>
                        <button className="text-sm font-medium text-primary hover:underline">
                          Reinstate
                        </button>
                      </form>
                    ) : (
                      <>
                        {(u.warnings ?? 0) > 0 && (
                          <form action={adminClearWarnings.bind(null, u.id)}>
                            <button className="text-sm font-medium text-foreground hover:underline">
                              Clear warnings
                            </button>
                          </form>
                        )}
                        <details className="relative">
                          <summary className="text-sm font-medium text-red-500 hover:underline cursor-pointer list-none">
                            Suspend
                          </summary>
                          <form
                            action={adminSuspendUser.bind(null, u.id)}
                            className="absolute right-0 mt-2 w-72 z-10 rounded-xl border border-border bg-card p-4 shadow-lg space-y-3"
                          >
                            <textarea
                              name="reason"
                              rows={3}
                              placeholder="Reason for suspension (sent to the user)"
                              className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button className="w-full bg-red-500 text-white rounded-full py-2 text-sm font-semibold hover:opacity-90">
                              Confirm suspension
                            </button>
                          </form>
                        </details>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Open disputes */}
        <h2 className="text-xl font-bold text-foreground mb-3">Open disputes</h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {disputes.length === 0 ? (
            <p className="p-6 text-muted-foreground">No open disputes.</p>
          ) : (
            disputes.map((d) => (
              <div
                key={d.id}
                className="p-5 flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="min-w-0">
                  <Link
                    href={`/contracts/${d.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {d.title || "Contract"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {nameById[d.client_id] || "Client"} ↔{" "}
                    {nameById[d.freelancer_id] || "Freelancer"}
                  </p>
                  {d.dispute_reason && (
                    <p className="text-sm text-foreground/80 mt-1">
                      “{d.dispute_reason}”
                    </p>
                  )}
                </div>
                <form action={adminResolveDispute.bind(null, d.id)}>
                  <button className="text-sm font-medium text-primary hover:underline shrink-0">
                    Mark resolved
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
