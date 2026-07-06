import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";

export const metadata = { title: "Invite declined | Xwork" };

// Warm confirmation page after declining an invite.
export default async function InviteDeclinedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blocked?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invite } = await supabase
    .from("invites")
    .select(
      "id, status, decline_reason, freelancer_id, job_id, jobs ( id, title, status ), client:profiles!client_id ( full_name )"
    )
    .eq("id", id)
    .maybeSingle();
  if (!invite || invite.freelancer_id !== user.id) notFound();
  if (invite.status !== "declined") redirect(`/invites/${id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(invite.jobs) ? invite.jobs[0] : invite.jobs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = Array.isArray(invite.client)
    ? invite.client[0]
    : invite.client;
  const clientName = client?.full_name || "the client";

  const REASON_LABEL: Record<string, string> = {
    skills_mismatch: "The job doesn't match my skills",
    budget_low: "The budget is too low for this job",
    not_available: "I'm not available right now",
    not_interested: "I'm not interested in this type of work",
    unclear_description: "The job description is unclear",
    other: "Other",
  };

  const jobStillOpen = job?.id && (!job?.status || job.status === "open");

  return (
    <main className="min-h-screen px-4 py-12 w-full">
      <div className="max-w-xl mx-auto text-center">
        {/* Friendly checkmark in a soft brand-colored circle */}
        <svg viewBox="0 0 96 96" className="w-24 h-24 mx-auto" aria-hidden fill="none">
          <circle cx="48" cy="48" r="44" className="fill-primary/15" />
          <path
            d="M32 50 L43 61 L65 37"
            className="stroke-[var(--primary)]"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="currentColor"
            style={{ color: "var(--primary)" }}
          />
        </svg>

        <h1 className="text-3xl font-bold text-foreground mt-5">
          Invite Declined
        </h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          That&apos;s completely fine! We&apos;ve let {clientName} know
          you&apos;re not available for this one. Keep an eye out — more
          invites and matching jobs are on the way.
        </p>

        {/* Summary */}
        <div className="rounded-2xl border border-border bg-card p-6 mt-7 text-left">
          <p className="text-sm text-muted-foreground">Job declined</p>
          <p className="font-medium text-foreground">{job?.title || "Job"}</p>
          <p className="text-sm text-muted-foreground mt-3">Reason</p>
          <p className="font-medium text-foreground">
            {REASON_LABEL[invite.decline_reason ?? ""] || "—"}
          </p>
          {sp.blocked && (
            <p className="text-sm text-foreground mt-4 rounded-lg bg-secondary p-3">
              You&apos;ve blocked invites from {clientName}. Manage this in{" "}
              <Link
                href="/settings/blocked-clients"
                className="text-primary underline"
              >
                Settings &gt; Blocked Clients
              </Link>
              .
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
          <Link
            href="/jobs"
            className="bg-primary text-primary-foreground rounded-full px-6 py-3 font-semibold hover:opacity-90"
          >
            🔍 Browse Matching Jobs
          </Link>
          <Link
            href="/freelancer"
            className="border border-border text-foreground rounded-full px-6 py-3 font-semibold hover:bg-secondary"
          >
            📋 View My Proposals
          </Link>
        </div>

        {jobStillOpen && (
          <p className="text-sm text-muted-foreground mt-6">
            Changed your mind? You can still{" "}
            <Link href={`/jobs/${job.id}`} className="text-primary underline">
              apply to this job
            </Link>{" "}
            manually if it&apos;s still open.
          </p>
        )}
      </div>
    </main>
  );
}
