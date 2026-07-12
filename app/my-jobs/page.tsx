import Link from "next/link";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import { JobPostMenu } from "@/components/job-post-menu";

export default async function MyJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("jobs")
    .select(`*, proposals ( id, status )`)
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  if (sp.q) query = query.ilike("title", `%${sp.q}%`);

  const { data: jobs } = await query;
  const list = jobs ?? [];

  // Bulk-load invite + message-thread counts for all of these jobs (Upwork's
  // "Invited" and "Messaged" tallies), then group by job_id — two queries
  // total rather than one per job.
  const jobIds = list.map((j) => j.id);
  const invitesByJob = new Map<string, number>();
  const messagedByJob = new Map<string, number>();
  if (jobIds.length) {
    const [{ data: inv }, { data: convo }] = await Promise.all([
      supabase.from("invites").select("job_id").in("job_id", jobIds),
      supabase.from("conversations").select("job_id").in("job_id", jobIds),
    ]);
    for (const r of inv ?? [])
      invitesByJob.set(r.job_id, (invitesByJob.get(r.job_id) ?? 0) + 1);
    for (const r of convo ?? [])
      messagedByJob.set(r.job_id, (messagedByJob.get(r.job_id) ?? 0) + 1);
  }

  const timeAgo = (iso: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };
  const fmtDate = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mb-6 text-sm">
        <span className="pb-2 border-b-2 border-foreground text-foreground font-medium">
          All job posts
        </span>
        <Link
          href="/contracts"
          className="pb-2 text-muted-foreground hover:text-foreground"
        >
          All contracts
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-foreground">All job posts</h1>
        <Link
          href="/jobs/new"
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold hover:opacity-90"
        >
          Post a new job
        </Link>
      </div>

      <form method="get" className="mb-4 flex items-center gap-4">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search job postings"
          className="flex-1 bg-card border border-border text-foreground rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="divide-y divide-border border-y border-border">
        {list.map((job) => {
          const props = (job.proposals as { status?: string }[]) ?? [];
          const proposalCount = props.length;
          const newCount = props.filter((p) => p.status === "pending").length;
          const hiredCount = props.filter((p) => p.status === "accepted").length;
          const invited = invitesByJob.get(job.id) ?? 0;
          const messaged = messagedByJob.get(job.id) ?? 0;
          const isDraft = job.status === "draft";
          const isClosed = job.status === "closed";

          const badge = isDraft
            ? { label: "Draft", cls: "bg-secondary text-muted-foreground" }
            : isClosed
            ? { label: "Closed", cls: "bg-secondary text-muted-foreground" }
            : { label: "Open job post", cls: "bg-primary/10 text-primary" };

          let statusLine: string;
          if (isDraft) statusLine = `Saved ${fmtDate(job.created_at)}`;
          else if (isClosed) statusLine = `Closed · ${fmtDate(job.created_at)}`;
          else statusLine = `Created ${timeAgo(job.created_at)}`;

          return (
            <div
              key={job.id}
              className="flex flex-col md:flex-row md:items-center gap-4 py-5"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-lg font-semibold text-foreground hover:text-primary"
                >
                  {job.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {statusLine}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Public · Fixed-price · ${job.budget}
                </p>
              </div>

              {!isDraft && (
                <div className="flex items-center gap-8 text-center">
                  <div>
                    <p className="font-semibold text-foreground">{invited}/30</p>
                    <p className="text-xs text-muted-foreground">Invited</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {proposalCount}
                      {newCount > 0 && (
                        <span className="text-primary font-medium">
                          {" "}
                          ({newCount} new)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Proposals</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{messaged}</p>
                    <p className="text-xs text-muted-foreground">Messaged</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {hiredCount}/1
                    </p>
                    <p className="text-xs text-muted-foreground">Hired</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {isDraft ? (
                  <Link
                    href={`/jobs/${job.id}`}
                    className="border border-primary text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/10 whitespace-nowrap"
                  >
                    Edit draft
                  </Link>
                ) : isClosed ? (
                  <Link
                    href="/jobs/new"
                    className="border border-primary text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/10 whitespace-nowrap"
                  >
                    Reuse posting
                  </Link>
                ) : (
                  <Link
                    href={`/jobs/${job.id}?tab=proposals`}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 whitespace-nowrap"
                  >
                    Review proposals
                  </Link>
                )}
                <JobPostMenu jobId={job.id} isDraft={isDraft} />
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            You haven&apos;t posted any jobs yet.{" "}
            <Link href="/jobs/new" className="text-primary hover:underline">
              Post a job
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
