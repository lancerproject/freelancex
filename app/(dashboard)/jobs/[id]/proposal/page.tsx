import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { EXPERIENCE_LEVELS, labelFor } from "@/lib/categories";
import { identityBlocked } from "@/lib/identity";
import { ProposalForm } from "@/components/proposal-form";
import { getMembership } from "@/lib/membership";

const MAX_APPLICANTS = 50;

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const { id } = await params;
  const { error, invite } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (!job) notFound();

  // The viewer's plan drives the marketplace fee preview (Pro 5%, Basic 10%).
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const viewerPlan = getMembership(viewerProfile).plan;

  // Gate: unverified freelancers can't apply.
  if (await identityBlocked()) {
    return (
      <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-4xl mb-3">🪪</div>
          <h1 className="text-2xl font-bold text-foreground">
            Verify your identity to apply
          </h1>
          <p className="text-muted-foreground mt-2">
            To apply for jobs and get hired on Xwork, you first need to verify
            your identity.
          </p>
          <Link
            href="/settings/identity?from=apply"
            className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
          >
            Verify identity
          </Link>
        </div>
      </main>
    );
  }

  // Applying is free, but a job only takes the first 50 applicants.
  const { count: applicantCountRaw } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("job_id", id);
  const applicantCount = applicantCountRaw ?? 0;
  const spotsLeft = Math.max(0, MAX_APPLICANTS - applicantCount);
  const isFull = applicantCount >= MAX_APPLICANTS;

  const skills = String(job.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  // Job is full — no more proposals accepted.
  if (isFull) {
    return (
      <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-4xl mb-3">🚫</div>
          <h1 className="text-2xl font-bold text-foreground">
            Applications are closed
          </h1>
          <p className="text-muted-foreground mt-2">
            This job has reached its limit of {MAX_APPLICANTS} applicants, so
            it&apos;s no longer accepting proposals. Browse other open jobs that
            still have room.
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
          >
            Find more work
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Link
          href={`/jobs/${id}`}
          className="text-sm text-primary hover:underline"
        >
          ← Back to job
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-3 mb-6">
          Submit a proposal
        </h1>

        {error === "full" && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            This job just reached its {MAX_APPLICANTS}-applicant limit and is no
            longer accepting proposals.
          </div>
        )}
        {error === "rate" && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            You&apos;re applying too quickly. Please wait a moment and try again.
          </div>
        )}
        {error === "submit" && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            Something went wrong submitting your proposal. Please try again.
          </div>
        )}
        {error === "offplatform" && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            ⚠ Your proposal was blocked and not submitted — it contains contact
            details or mentions payment outside Xwork, which isn&apos;t allowed.
            A policy warning was recorded on your account. Remove the contact or
            payment references and try again.
          </div>
        )}

        {/* Job details */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Job details</h2>
          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {job.category ? `${job.category} · ` : ""}${job.budget} · Fixed-price
            {job.experience_level
              ? ` · ${labelFor(EXPERIENCE_LEVELS, job.experience_level)}`
              : ""}
          </p>
          {job.description && (
            <p className="text-foreground/90 mt-4 whitespace-pre-wrap line-clamp-6">
              {job.description}
            </p>
          )}
          <Link
            href={`/jobs/${id}`}
            className="inline-block text-sm text-primary hover:underline mt-3"
          >
            View job posting
          </Link>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {skills.slice(0, 10).map((s) => (
                <span
                  key={s}
                  className="text-xs bg-secondary text-foreground rounded-full px-3 py-1"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            {applicantCount} / {MAX_APPLICANTS} applicants ·{" "}
            {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
          </p>
        </div>

        <ProposalForm
          jobId={id}
          budget={job.budget}
          inviteId={invite}
          plan={viewerPlan}
          screeningQuestions={
            Array.isArray(job.screening_questions)
              ? job.screening_questions
              : []
          }
        />
      </div>
    </main>
  );
}
