import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { toggleSaveJob } from "@/app/saved/actions";

export default async function SavedJobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: saved } = await supabase
    .from("saved_jobs")
    .select(`id, job_id, jobs (*)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (saved ?? []).filter((s) => s.jobs);

  return (
    <main className="min-h-screen px-4 lg:px-8 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">Saved Jobs</h1>

      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border border-border rounded-2xl">
          You haven&apos;t saved any jobs yet.{" "}
          <Link href="/jobs" className="text-primary hover:underline">
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((s) => {
            const job = Array.isArray(s.jobs) ? s.jobs[0] : s.jobs;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-lg font-semibold text-primary hover:underline"
                  >
                    {job.title}
                  </Link>
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    ${job.budget} · Fixed-price
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
                <form
                  action={toggleSaveJob.bind(null, job.id, "/saved")}
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="text-sm text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
