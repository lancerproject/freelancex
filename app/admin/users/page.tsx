import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { WARNING_LIMIT } from "@/lib/moderation";
import {
  adminSuspendUser,
  adminReinstateUser,
  adminClearWarnings,
} from "../actions";

export const metadata = { title: "Users | Xwork Admin" };

// Admin user search + risk view. Search by name, email or username; results are
// ranked most-risky first (suspended, then most warnings, then lowest health).
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const query = (q || "").trim();

  const admin = createAdminClient();
  let builder = admin
    .from("profiles")
    .select(
      "id, full_name, username, email, role, warnings, suspended, account_status, health_score, health_badge, id_verified, created_at, total_spent"
    );

  if (query) {
    // Escape PostgREST or() reserved chars in user input.
    const safe = query.replace(/[(),*]/g, " ");
    builder = builder.or(
      `full_name.ilike.%${safe}%,email.ilike.%${safe}%,username.ilike.%${safe}%`
    );
  }

  const { data: rows } = await builder.limit(query ? 50 : 25);
  const users = (rows ?? []).sort((a, b) => {
    if (!!a.suspended !== !!b.suspended) return a.suspended ? -1 : 1;
    if ((b.warnings ?? 0) !== (a.warnings ?? 0))
      return (b.warnings ?? 0) - (a.warnings ?? 0);
    return (a.health_score ?? 100) - (b.health_score ?? 100);
  });

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Trust &amp; Safety
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-3">Users</h1>
        <p className="text-muted-foreground mt-1 mb-6">
          Search any account and review its risk signals.
        </p>

        {/* Search */}
        <form method="get" className="flex gap-2 mb-8 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name, email or username…"
            className="flex-1 border border-border rounded-full px-4 py-2.5 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90">
            Search
          </button>
        </form>

        <p className="text-sm text-muted-foreground mb-3">
          {query
            ? `${users.length} result${users.length === 1 ? "" : "s"} for “${query}”`
            : `Showing ${users.length} most recent accounts`}
        </p>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {users.length === 0 ? (
            <p className="p-6 text-muted-foreground">No matching users.</p>
          ) : (
            users.map((u) => {
              const risk = u.suspended
                ? { label: "Suspended", cls: "bg-red-500/10 text-red-500" }
                : (u.warnings ?? 0) > 0
                  ? {
                      label: `${u.warnings}/${WARNING_LIMIT} warnings`,
                      cls: "bg-amber-500/10 text-amber-600",
                    }
                  : { label: "Good standing", cls: "bg-primary/10 text-primary" };
              return (
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
                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${risk.cls}`}
                        >
                          {risk.label}
                        </span>
                        <span className="text-muted-foreground">
                          Health {u.health_score ?? "—"}
                          {u.health_badge ? ` · ${u.health_badge}` : ""}
                        </span>
                        <span
                          className={
                            u.id_verified
                              ? "text-primary"
                              : "text-muted-foreground"
                          }
                        >
                          {u.id_verified ? "✅ ID verified" : "○ ID unverified"}
                        </span>
                        <span className="text-muted-foreground">
                          Joined {fmt(u.created_at)}
                        </span>
                        {u.role === "client" && (
                          <span className="text-muted-foreground">
                            ${Number(u.total_spent ?? 0).toLocaleString()} spent
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
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
