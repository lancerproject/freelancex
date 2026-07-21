"use server";

import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { notify } from "@/lib/notify";
import { identityBlocked } from "@/lib/identity";
import { isRateLimited } from "@/lib/rate-limit";
import { detectOffPlatform, recordWarning } from "@/lib/moderation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const MAX_APPLICANTS = 50; // a job stops accepting proposals after 50 (first come, first served)

export async function submitProposal(jobId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Suspended accounts can't apply to jobs.
  const { data: meSus } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (meSus?.suspended) redirect("/dashboard");

  // Identity must be verified before applying.
  if (await identityBlocked()) redirect("/settings/identity?from=apply");

  // Check for an existing proposal. An active (non-withdrawn) one blocks a
  // duplicate application; a withdrawn one is reused so the freelancer can
  // re-apply (keeps exactly one row per job+freelancer).
  const { data: existing } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("job_id", jobId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (existing && existing.status !== "withdrawn") redirect(`/jobs/${jobId}`);

  // Rate limit: no more than ~10 proposals per minute per freelancer.
  if (await isRateLimited(supabase, "proposals", "freelancer_id", user.id, 60, 10)) {
    redirect(`/jobs/${jobId}/proposal?error=rate`);
  }

  // Applying is FREE. A job stops accepting proposals once 50 freelancers have
  // applied (first come, first served).
  const { count: applicantCount } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .neq("status", "withdrawn");
  if ((applicantCount ?? 0) >= MAX_APPLICANTS) {
    redirect(`/jobs/${jobId}/proposal?error=full`);
  }

  const profile = await loadOwnProfile(user.id);

  const coverLetter = formData.get("cover_letter") as string;

  // Cover letters go through the same scanner as chat: attempts to share
  // contact details or arrange outside payment are blocked (the proposal is
  // never submitted), warned, and recorded on account health.
  const det = detectOffPlatform(coverLetter || "");
  if (det.flagged) {
    await recordWarning(supabase, user.id, det.reason, det.category);
    redirect(`/jobs/${jobId}/proposal?error=offplatform`);
  }

  const paymentType =
    (formData.get("payment_type") as string) === "milestone"
      ? "milestone"
      : "project";
  const duration = (formData.get("duration") as string) || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let milestones: any[] = [];
  try {
    milestones = JSON.parse((formData.get("milestones") as string) || "[]");
  } catch {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attachments: any[] = [];
  try {
    attachments = JSON.parse((formData.get("attachments") as string) || "[]");
  } catch {}

  // Total bid: from milestones in milestone mode, otherwise the single bid.
  let bidAmount = Number(formData.get("bid_amount")) || 0;
  if (paymentType === "milestone") {
    bidAmount = milestones.reduce(
      (s, m) => s + (Number(m.amount) || 0),
      0
    );
  }

  // Numeric bounds (server-side): reject non-positive, non-finite, or absurd
  // amounts so a crafted request can't submit a negative or overflow bid.
  const MAX_BID = 1_000_000;
  if (!Number.isFinite(bidAmount) || bidAmount <= 0 || bidAmount > MAX_BID) {
    redirect(`/jobs/${jobId}/proposal?error=amount`);
  }
  if (
    paymentType === "milestone" &&
    milestones.some(
      (m) => !Number.isFinite(Number(m.amount)) || Number(m.amount) <= 0
    )
  ) {
    redirect(`/jobs/${jobId}/proposal?error=amount`);
  }

  // Map the chosen duration to an approximate number of days (kept for the
  // existing "delivery" displays on the client's proposal review).
  const DAYS: Record<string, number> = {
    less_than_7_days: 7,
    less_than_1_month: 30,
    "1_to_3_months": 90,
    "3_to_6_months": 180,
    more_than_6_months: 365,
  };
  const deliveryDays = duration ? DAYS[duration] ?? null : null;

  // Answers to the client's screening questions (if any).
  let screeningAnswers: { question: string; answer: string }[] = [];
  try {
    const parsed = JSON.parse(
      (formData.get("screening_answers") as string) || "[]"
    );
    if (Array.isArray(parsed)) screeningAnswers = parsed.slice(0, 8);
  } catch {
    /* none */
  }

  const fields = {
    cover_letter: coverLetter,
    bid_amount: bidAmount,
    delivery_days: deliveryDays,
    payment_type: paymentType,
    milestones: paymentType === "milestone" ? milestones : null,
    duration,
    attachments: attachments.length ? attachments : null,
    screening_answers: screeningAnswers,
  };

  let error;
  let proposalId = existing?.id as string | undefined;
  if (existing) {
    // Re-apply: reuse the withdrawn row, resetting it to a fresh pending proposal.
    ({ error } = await supabase
      .from("proposals")
      .update({
        ...fields,
        status: "pending",
        viewed_at: null,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id));
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("proposals")
      .insert({ job_id: jobId, freelancer_id: user.id, ...fields })
      .select("id")
      .single();
    error = insErr;
    proposalId = inserted?.id;
  }

  if (error) redirect(`/jobs/${jobId}/proposal?error=submit`);

  const { data: job } = await supabase
    .from("jobs")
    .select("client_id, title")
    .eq("id", jobId)
    .single();

  const who =
    profile?.full_name || profile?.username || profile?.email || "A freelancer";

  // Invite flow: applying via a client invite finishes the invite — link the
  // proposal, open the chat room, drop a system note and tell the client.
  const inviteId = (formData.get("invite_id") as string) || "";
  if (inviteId && job) {
    const { data: invite } = await supabase
      .from("invites")
      .select("id, client_id, freelancer_id, job_id, status")
      .eq("id", inviteId)
      .maybeSingle();
    if (
      invite &&
      invite.freelancer_id === user.id &&
      invite.job_id === jobId &&
      invite.status === "accepted"
    ) {
      await supabase
        .from("invites")
        .update({ resulting_proposal_id: proposalId ?? null })
        .eq("id", inviteId);

      // Get or create the job conversation between the two.
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("job_id", jobId)
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${invite.client_id}),and(participant_1.eq.${invite.client_id},participant_2.eq.${user.id})`
        )
        .limit(1)
        .maybeSingle();
      let convoId = existingConvo?.id as string | undefined;
      if (!convoId) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({
            job_id: jobId,
            participant_1: invite.client_id,
            participant_2: user.id,
          })
          .select("id")
          .single();
        convoId = created?.id;
      }

      if (convoId) {
        const { data: clientProf } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", invite.client_id)
          .maybeSingle();
        // System note pinned at the start of the conversation.
        try {
          await supabase.from("messages").insert({
            conversation_id: convoId,
            sender_id: user.id,
            kind: "system",
            content: `You accepted ${clientProf?.full_name || "the client"}'s invite and submitted a proposal for "${job.title}". Start the conversation!`,
          });
        } catch {
          /* pre-migration (no kind column) — skip the note */
        }

        await notify(
          supabase,
          invite.client_id,
          "invite",
          `${who} accepted your invite`,
          `${who} accepted your invite and submitted a proposal for "${job.title}".`,
          `/jobs/${jobId}?tab=proposals`
        );

        revalidatePath("/freelancer");
        redirect(`/messages/${convoId}`);
      }
    }
  }

  // Standard flow: notify the client of the new proposal.
  if (job) {
    await notify(
      supabase,
      job.client_id,
      "proposal",
      "New proposal received",
      `${who} applied to your job "${job.title}".`,
      `/jobs/${jobId}?tab=proposals`
    );
  }

  redirect(`/jobs/${jobId}?applied=1`);
}
