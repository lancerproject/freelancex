import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { SendOfferForm } from "@/components/send-offer-form";
import { LocalTime } from "@/components/local-time";

export const metadata = { title: "Send an offer | Xwork" };

// Client sends a formal job offer — reached from a proposal's "Send offer"
// button (?job=&proposal=) or directly for a freelancer (?freelancer=).
export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{
    job?: string;
    proposal?: string;
    freelancer?: string;
    request?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let freelancerId = sp.freelancer ?? "";
  let defaultTitle = "";
  let defaultAmount: number | undefined;
  let defaultRateType: "fixed" | "hourly" | undefined;
  let defaultDuration: string | undefined;
  let defaultDescription: string | undefined;
  let defaultMilestones:
    | { name: string; amount: string; due_date: string }[]
    | undefined;
  let jobId = sp.job ?? "";
  const proposalId = sp.proposal ?? "";
  const requestId = sp.request ?? "";

  // Answering a freelancer's contract proposal — prefill everything from it.
  if (requestId) {
    const { data: request } = await supabase
      .from("contract_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (!request || request.client_id !== user.id) notFound();
    freelancerId = request.freelancer_id;
    jobId = request.job_id ?? "";
    defaultTitle = request.title || "";
    defaultAmount = Number(request.amount) || undefined;
    defaultRateType = request.rate_type === "hourly" ? "hourly" : "fixed";
    defaultDuration = request.duration ?? undefined;
    defaultDescription = request.description ?? undefined;
    if (Array.isArray(request.milestones)) {
      defaultMilestones = request.milestones.map(
        (m: { name?: string; amount?: number; due_date?: string }) => ({
          name: m.name ?? "",
          amount: m.amount != null ? String(m.amount) : "",
          due_date: m.due_date ?? "",
        })
      );
    }
  }

  if (proposalId) {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, freelancer_id, bid_amount, job_id, jobs ( id, title, client_id )")
      .eq("id", proposalId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job: any = proposal
      ? Array.isArray(proposal.jobs)
        ? proposal.jobs[0]
        : proposal.jobs
      : null;
    if (!proposal || !job || job.client_id !== user.id) notFound();
    freelancerId = proposal.freelancer_id;
    jobId = job.id;
    defaultTitle = job.title || "";
    defaultAmount = Number(proposal.bid_amount) || undefined;
  }

  if (!freelancerId) notFound();

  const { data: freelancer } = await supabase
    .from("profiles")
    .select("id, full_name, title, avatar_url, location, country, city, timezone")
    .eq("id", freelancerId)
    .maybeSingle();
  if (!freelancer) notFound();
  const freelancerName = freelancer.full_name || "this freelancer";
  const freelancerLoc =
    freelancer.location ||
    [freelancer.city, freelancer.country].filter(Boolean).join(", ");

  // Related job title for the "Job details" link.
  let jobTitle: string | undefined = defaultTitle || undefined;
  if (jobId) {
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", jobId)
      .maybeSingle();
    if (jobRow?.title) jobTitle = jobRow.title;
  }

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full max-w-6xl mx-auto">
      <Link
        href={jobId ? `/jobs/${jobId}?tab=proposals` : "/offers"}
        className="text-sm text-primary hover:underline"
      >
        ← Back
      </Link>
      <h1 className="text-4xl font-bold text-foreground mt-3">Send an offer</h1>
      <p className="text-muted-foreground mt-2 mb-8">
        Set the terms, then send your offer to {freelancerName}. You only fund
        the work in escrow after they accept — no charge until then.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div>
          <SendOfferForm
            freelancerId={freelancerId}
            freelancerName={freelancerName}
            jobId={jobId || undefined}
            jobTitle={jobTitle}
            proposalId={proposalId || undefined}
            requestId={requestId || undefined}
            defaultTitle={defaultTitle}
            defaultAmount={defaultAmount}
            defaultRateType={defaultRateType}
            defaultDuration={defaultDuration}
            defaultDescription={defaultDescription}
            defaultMilestones={defaultMilestones}
          />
        </div>

        {/* Freelancer summary (right sidebar, like Upwork) */}
        <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            {freelancer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={freelancer.avatar_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {freelancerName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link
                href={`/profile/${freelancerId}`}
                className="font-semibold text-foreground hover:text-primary block truncate"
              >
                {freelancerName}
              </Link>
              {freelancer.title && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {freelancer.title}
                </p>
              )}
            </div>
          </div>
          {freelancerLoc && (
            <p className="text-sm text-foreground mt-3">
              {freelancerLoc}
              <span className="text-muted-foreground">
                {" · "}
                <LocalTime timezone={freelancer.timezone ?? undefined} /> local
                time
              </span>
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
