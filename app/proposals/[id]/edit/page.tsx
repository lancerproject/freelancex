import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { canWithdraw } from "@/lib/proposal-status";
import { EditProposalForm } from "@/components/edit-proposal-form";

export const metadata = { title: "Edit proposal | Xwork" };

// Edit a submitted proposal while the client can still act on it. Once it's
// been accepted, declined or withdrawn, editing closes.

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "id, freelancer_id, status, payment_type, cover_letter, bid_amount, duration, milestones, jobs ( title )"
    )
    .eq("id", id)
    .eq("freelancer_id", user.id)
    .maybeSingle();
  if (!proposal) redirect("/freelancer");
  if (!canWithdraw(proposal.status)) redirect(`/proposals/${id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = proposal.jobs as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const milestones: any[] = Array.isArray(proposal.milestones)
    ? proposal.milestones
    : [];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[760px] mx-auto">
        <Link
          href={`/proposals/${id}`}
          className="text-sm text-primary hover:underline"
        >
          ← Back to proposal
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">
          Edit proposal
        </h1>
        <p className="text-muted-foreground mt-1">
          {job?.title || "Job"} — your changes replace the proposal the client
          sees.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <EditProposalForm
            proposalId={proposal.id}
            paymentType={
              proposal.payment_type === "milestone" ? "milestone" : "project"
            }
            initialCoverLetter={proposal.cover_letter || ""}
            initialBid={Number(proposal.bid_amount) || 0}
            initialDuration={proposal.duration || ""}
            initialMilestones={milestones}
          />
        </div>
      </div>
    </main>
  );
}
