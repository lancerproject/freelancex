import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";
import { adminRemoveJob, adminDismissJobReports } from "../actions";

export const metadata = { title: "Job moderation | Xwork Admin" };

// Job-moderation queue: reported jobs first (needs attention), then the most
// recent open jobs so an admin can proactively spot-check the marketplace.
export default async function AdminJobsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  // Pending reports, newest first, with the reported job.
  const { data: reportRows } = await admin
    .from("job_reports")
    .select(
      "id, job_id, reason, description, created_at, jobs ( id, title, client_id, status )"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Group reports by job.
  type Rep = {
    id: string;
    reason: string;
    description: string | null;
    created_at: string;
  };
  const byJob = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { job: any; reports: Rep[] }
  >();
  for (const r of reportRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job: any = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
    if (!job) continue;
    if (!byJob.has(job.id)) byJob.set(job.id, { job, reports: [] });
    byJob.get(job.id)!.reports.push({
      id: r.id,
      reason: r.reason,
      description: r.description,
      created_at: r.created_at,
    });
  }
  const reported = Array.from(byJob.values());

  // Recent open jobs for proactive review.
  const { data: recentJobs } = await admin
    .from("jobs")
    .select("id, title, client_id, status, created_at, budget, category")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(15);
  const recent = recentJobs ?? [];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const RemoveControl = ({ jobId }: { jobId: string }) => (
    <details className="relative">
      <summary className="text-sm font-medium text-red-500 hover:underline cursor-pointer list-none">
        Remove job
      </summary>
      <form
        action={adminRemoveJob.bind(null, jobId)}
        className="absolute right-0 mt-2 w-72 z-10 rounded-xl border border-border bg-card p-4 shadow-lg space-y-3"
      >
        <textarea
          name="reason"
          rows={3}
          placeholder="Reason (sent to the client)"
          className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button className="w-full bg-red-500 text-white rounded-full py-2 text-sm font-semibold hover:opacity-90">
          Confirm removal
        </button>
      </form>
    </details>
  );

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Trust &amp; Safety
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-3">
          Job moderation
        </h1>
        <p className="text-muted-foreground mt-1 mb-8">
          Review reported postings and spot-check recent jobs.
        </p>

        {/* Reported jobs */}
        <h2 className="text-xl font-bold text-foreground mb-3">
          Reported jobs{" "}
          {reported.length > 0 && (
            <span className="text-sm font-normal text-red-500">
              ({reported.length} need review)
            </span>
          )}
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border mb-10">
          {reported.length === 0 ? (
            <p className="p-6 text-muted-foreground">
              No reported jobs. All clear. 🎉
            </p>
          ) : (
            reported.map(({ job, reports }) => (
              <div key={job.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {job.title || "Job"}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {reports.length} report{reports.length === 1 ? "" : "s"} ·
                      status: {job.status}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {reports.map((r) => (
                        <li key={r.id} className="text-sm">
                          <span className="inline-block rounded-full bg-amber-500/10 text-amber-600 px-2 py-0.5 text-xs font-medium capitalize">
                            {r.reason}
                          </span>{" "}
                          {r.description && (
                            <span className="text-foreground/80">
                              “{r.description}”
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {" "}
                            · {fmt(r.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <form action={adminDismissJobReports.bind(null, job.id)}>
                      <button className="text-sm font-medium text-foreground hover:underline">
                        Dismiss
                      </button>
                    </form>
                    <RemoveControl jobId={job.id} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent open jobs */}
        <h2 className="text-xl font-bold text-foreground mb-3">
          Recent open jobs
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {recent.length === 0 ? (
            <p className="p-6 text-muted-foreground">No open jobs.</p>
          ) : (
            recent.map((j) => (
              <div
                key={j.id}
                className="p-5 flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {j.title || "Job"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {j.category || "Uncategorized"} · posted {fmt(j.created_at)}
                    {j.budget ? ` · $${Number(j.budget).toLocaleString()}` : ""}
                  </p>
                </div>
                <RemoveControl jobId={j.id} />
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
