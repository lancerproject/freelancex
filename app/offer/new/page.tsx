import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { SendOfferForm } from "@/components/send-offer-form";

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
    .select("id, full_name")
    .eq("id", freelancerId)
    .maybeSingle();
  if (!freelancer) notFound();
  const freelancerName = freelancer.full_name || "this freelancer";

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-2xl mx-auto">
        <Link
          href={jobId ? `/jobs/${jobId}?tab=proposals` : "/offers"}
          className="text-sm text-primary hover:underline"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-3">
          Send a job offer
        </h1>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          {freelancerName} will be able to review everything below and accept
          or decline. Nothing is charged until you fund a milestone on the
          contract.
        </p>

        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <SendOfferForm
            freelancerId={freelancerId}
            freelancerName={freelancerName}
            jobId={jobId || undefined}
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
      </div>
    </main>
  );
}
