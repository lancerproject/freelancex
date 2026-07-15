"use server";

import { createClient } from "../../lib/supabase-server";
import { notify } from "../../lib/notify";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canWithdraw } from "@/lib/proposal-status";
import { detectOffPlatform, recordWarning } from "@/lib/moderation";

// Edit a submitted proposal while the client can still act on it (pending or
// shortlisted). The cover letter passes the same off-platform scanner as the
// original submission.
export async function updateProposal(
  proposalId: string,
  input: {
    coverLetter: string;
    bidAmount: number;
    duration: string;
    milestones: { description: string; amount: number; due_date?: string }[];
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, freelancer_id, status, payment_type, job_id")
    .eq("id", proposalId)
    .eq("freelancer_id", user.id)
    .maybeSingle();
  if (!proposal) return { ok: false, error: "Proposal not found." };
  if (!canWithdraw(proposal.status)) {
    return {
      ok: false,
      error: "This proposal can no longer be edited.",
    };
  }

  const coverLetter = (input.coverLetter || "").trim();
  if (coverLetter.length < 30) {
    return { ok: false, error: "Your cover letter needs at least 30 characters." };
  }
  const det = detectOffPlatform(coverLetter);
  if (det.flagged) {
    await recordWarning(supabase, user.id, det.reason, det.category);
    return { ok: false, error: det.reason };
  }

  const isMilestone = proposal.payment_type === "milestone";
  const milestones = (input.milestones || [])
    .map((m) => ({
      description: (m.description || "").trim(),
      amount: Number(m.amount) || 0,
      due_date: m.due_date || undefined,
    }))
    .filter((m) => m.description && m.amount > 0);
  const bidAmount = isMilestone
    ? milestones.reduce((s, m) => s + m.amount, 0)
    : Number(input.bidAmount) || 0;
  if (bidAmount <= 0) {
    return {
      ok: false,
      error: isMilestone
        ? "Add at least one milestone with a name and amount."
        : "Enter your bid amount.",
    };
  }

  const DAYS: Record<string, number> = {
    less_than_7_days: 7,
    less_than_1_month: 30,
    "1_to_3_months": 90,
    "3_to_6_months": 180,
    more_than_6_months: 365,
  };
  const duration = input.duration || null;

  const { error } = await supabase
    .from("proposals")
    .update({
      cover_letter: coverLetter,
      bid_amount: bidAmount,
      duration,
      delivery_days: duration ? DAYS[duration] ?? null : null,
      milestones: isMilestone ? milestones : null,
    })
    .eq("id", proposalId)
    .eq("freelancer_id", user.id);
  if (error) {
    return { ok: false, error: "Couldn't save your changes. Please try again." };
  }

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/freelancer");
  return { ok: true };
}

export async function hireFreelancer(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await supabase
    .from("proposals")
    .select(`*, jobs (*)`)
    .eq("id", proposalId)
    .single();

  if (!proposal) return;

  // Authorization: only the client who OWNS the job may hire, and only a live
  // (pending/shortlisted) proposal can be accepted. Without this, anyone could
  // POST an arbitrary proposalId and force-create a binding contract between
  // two unrelated parties.
  if (proposal.jobs?.client_id !== user.id) redirect("/dashboard");
  if (!["pending", "shortlisted"].includes(proposal.status)) {
    redirect(`/jobs/${proposal.job_id}?tab=proposals`);
  }

  await supabase
    .from("proposals")
    .update({ status: "accepted" })
    .eq("id", proposalId)
    .eq("status", proposal.status); // no-op if it changed under us (double-hire race)

  const { data: contractData } = await supabase
    .from("contracts")
    .insert({
      job_id: proposal.job_id,
      client_id: proposal.jobs.client_id,
      freelancer_id: proposal.freelancer_id,
      proposal_id: proposal.id,
      title: proposal.jobs.title,
      amount: proposal.bid_amount,
      status: "active",
      start_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (contractData) {
    await supabase.from("conversations").insert({
      job_id: proposal.job_id,
      contract_id: contractData.id,
      participant_1: proposal.jobs.client_id,
      participant_2: proposal.freelancer_id,
    });

    // Route through notify() so these respect notification preferences and
    // also send an email.
    await notify(
      supabase,
      proposal.freelancer_id,
      "proposal",
      "You got hired! 🎉",
      `You've been hired for "${proposal.jobs.title}". Head to your contract to get started.`,
      "/contracts/" + contractData.id
    );
    await notify(
      supabase,
      proposal.jobs.client_id,
      "system",
      "Contract started",
      `You hired a freelancer for "${proposal.jobs.title}".`,
      "/contracts/" + contractData.id
    );
  }

  redirect("/contracts");
}

// The withdrawal reasons offered in the modal. Kept as a local (non-exported)
// const — "use server" files may only export async functions.
const WITHDRAW_REASONS = [
  "found_other",
  "not_fit",
  "budget_low",
  "made_mistake",
  "client_unresponsive",
  "other",
] as const;

// Freelancer withdraws their own proposal, with a required reason. Not allowed
// once the job is closed, the freelancer is hired, or a pending job offer
// exists for the job (they must respond to the offer first). Marks it
// withdrawn (removes the "Applied" badge, lets them re-apply, moves it to
// Archived), drops a system note into the job chat if the client had messaged,
// and notifies the client.
export async function withdrawProposal(
  proposalId: string,
  reason?: string,
  customReason?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "id, freelancer_id, status, job_id, jobs ( title, client_id, status )"
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (!proposal || proposal.freelancer_id !== user.id) {
    return { ok: false, error: "Proposal not found." };
  }
  if (!canWithdraw(proposal.status)) {
    return { ok: false, error: "This proposal can no longer be withdrawn." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(proposal.jobs)
    ? proposal.jobs[0]
    : proposal.jobs;

  // Restriction: job already closed.
  if (job?.status && job.status !== "open") {
    return { ok: false, error: "This job is closed — the proposal is already archived." };
  }
  // Restriction: a pending job offer exists for this job — respond to it first.
  const { data: pendingOffer } = await supabase
    .from("contracts")
    .select("id")
    .eq("freelancer_id", user.id)
    .eq("job_id", proposal.job_id)
    .eq("status", "offer")
    .limit(1)
    .maybeSingle();
  if (pendingOffer) {
    return {
      ok: false,
      error: "You have a pending job offer for this job — respond to the offer first.",
    };
  }

  // Reason is required; "other" needs a short explanation.
  const r = (reason || "").trim();
  const custom = (customReason || "").trim();
  if (!WITHDRAW_REASONS.includes(r as (typeof WITHDRAW_REASONS)[number])) {
    return { ok: false, error: "Please select a reason for withdrawing." };
  }
  if (r === "other" && custom.length < 10) {
    return { ok: false, error: "Please tell us a bit more (at least 10 characters)." };
  }

  const { error } = await supabase
    .from("proposals")
    .update({
      status: "withdrawn",
      withdrawal_reason: r,
      withdrawal_reason_custom: r === "other" ? custom : null,
      withdrawn_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("freelancer_id", user.id);
  if (error) return { ok: false, error: "Couldn't withdraw. Please try again." };

  if (job?.client_id) {
    // If the client had already messaged about this job, leave a system note
    // in that chat so the conversation history makes sense.
    try {
      const { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("job_id", proposal.job_id)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .limit(1)
        .maybeSingle();
      if (convo) {
        const { count: clientMsgs } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convo.id)
          .neq("sender_id", user.id);
        if ((clientMsgs ?? 0) > 0) {
          await supabase.from("messages").insert({
            conversation_id: convo.id,
            sender_id: user.id,
            kind: "system",
            content: "The freelancer has withdrawn their proposal for this job.",
          });
        }
      }
    } catch {
      /* pre-migration (no kind column) — skip the note */
    }

    await notify(
      supabase,
      job.client_id,
      "proposal",
      "A proposal was withdrawn",
      `A freelancer withdrew their proposal for "${job.title}".`,
      `/jobs/${proposal.job_id}?tab=proposals`
    );
  }

  revalidatePath("/proposals");
  revalidatePath("/freelancer");
  revalidatePath(`/jobs/${proposal.job_id}`);
  return { ok: true };
}

// Marks all as-yet-unviewed proposals on a job as viewed, and notifies each
// freelancer that the client looked at their proposal. Called when the client
// opens the job's proposals tab. Only fires once per proposal (viewed_at guard).
export async function markJobProposalsViewed(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id) return; // only the job's owner

  const { data: unseen } = await supabase
    .from("proposals")
    .select("id, freelancer_id")
    .eq("job_id", jobId)
    .is("viewed_at", null);
  if (!unseen || unseen.length === 0) return;

  await supabase
    .from("proposals")
    .update({ viewed_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .is("viewed_at", null);

  for (const p of unseen) {
    await notify(
      supabase,
      p.freelancer_id,
      "proposal",
      "Your proposal was viewed",
      `Your proposal for "${job.title}" was viewed by the client.`,
      `/jobs/${jobId}`
    );
  }
}

export async function completeContract(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("client_id, freelancer_id, title, status")
    .eq("id", contractId)
    .single();

  // Authorization: only a party to the contract may complete it, and only from
  // an active state. Prevents anyone from marking strangers' contracts complete
  // (integrity/health-score tampering) by POSTing an arbitrary contractId.
  if (!contract) redirect("/dashboard");
  if (contract.client_id !== user.id && contract.freelancer_id !== user.id) {
    redirect("/dashboard");
  }

  await supabase
    .from("contracts")
    .update({
      status: "completed",
      end_date: new Date().toISOString(),
    })
    .eq("id", contractId)
    .in("status", ["active", "in_progress"]);

  if (contract) {
    const msg = `The contract "${contract.title}" has been completed.`;
    await notify(supabase, contract.client_id, "system", "Contract completed", msg, `/contracts/${contractId}`);
    await notify(supabase, contract.freelancer_id, "system", "Contract completed", msg, `/contracts/${contractId}`);
    // Account health: completed jobs give a small boost — recalc.
    try {
      const { recalcHealth } = await import("@/lib/health");
      await recalcHealth(contract.freelancer_id, "job_completed");
    } catch {
      /* best-effort */
    }
  }

  redirect("/contracts");
}

// Client shortlists / un-shortlists a proposal (the 👍 on the card). Only the
// job's own client may act on its proposals.
export async function shortlistProposal(
  proposalId: string,
  jobId: string,
  on: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: job } = await supabase
    .from("jobs")
    .select("client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id) redirect(`/jobs/${jobId}`);

  // Shortlisting also un-archives (mutually exclusive).
  await supabase
    .from("proposals")
    .update({ shortlisted: on, ...(on ? { archived: false } : {}) })
    .eq("id", proposalId)
    .eq("job_id", jobId);
  revalidatePath(`/jobs/${jobId}`);
}

// Client archives / restores a proposal (the 👎 on the card).
export async function archiveProposal(
  proposalId: string,
  jobId: string,
  on: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: job } = await supabase
    .from("jobs")
    .select("client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id) redirect(`/jobs/${jobId}`);

  await supabase
    .from("proposals")
    .update({ archived: on, ...(on ? { shortlisted: false } : {}) })
    .eq("id", proposalId)
    .eq("job_id", jobId);
  revalidatePath(`/jobs/${jobId}`);
}