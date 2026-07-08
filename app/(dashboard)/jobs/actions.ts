"use server";

import { createClient } from "@/lib/supabase-server";
import { notify } from "@/lib/notify";
import { redirect } from "next/navigation";

// Publish a draft job (set its status to open).
export async function publishDraft(jobId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("jobs")
    .update({ status: "open" })
    .eq("id", jobId)
    .eq("client_id", user.id);

  redirect("/dashboard");
}

// Invite a freelancer to apply. Creates a real invite record the freelancer
// responds to (accept → proposal, decline → reason). Silently skipped when the
// freelancer has blocked this client's invites — the client never knows.
export async function inviteToJob(jobId: string, freelancerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("title, client_id")
    .eq("id", jobId)
    .single();
  if (!job || job.client_id !== user.id) redirect(`/jobs/${jobId}`);

  // Block check runs with the service role — the block list is the
  // freelancer's private data (RLS hides it from the client).
  let blocked = false;
  try {
    const { createAdminClient } = await import("@/lib/supabase-admin");
    const { data: block } = await createAdminClient()
      .from("client_invite_blocks")
      .select("id")
      .eq("freelancer_id", freelancerId)
      .eq("client_id", user.id)
      .limit(1)
      .maybeSingle();
    blocked = !!block;
  } catch {
    /* pre-migration: continue without block check */
  }
  if (blocked) {
    // Silently pretend it was sent — the freelancer never receives it.
    redirect(`/jobs/${jobId}?tab=invite&invited=1`);
  }

  // One pending invite per job+freelancer.
  const { data: existing } = await supabase
    .from("invites")
    .select("id")
    .eq("job_id", jobId)
    .eq("freelancer_id", freelancerId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/jobs/${jobId}?tab=invite&invited=1`);

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const clientName = me?.full_name || "A client";

  const { data: invite } = await supabase
    .from("invites")
    .insert({
      job_id: jobId,
      client_id: user.id,
      freelancer_id: freelancerId,
      status: "pending",
    })
    .select("id")
    .single();

  await notify(
    supabase,
    freelancerId,
    "invite",
    `💼 ${clientName} invited you to apply to "${job?.title ?? "a job"}"`,
    `${clientName} thinks you could be a great fit. View the invite to accept and submit a proposal, or decline.`,
    invite ? `/invites/${invite.id}` : `/jobs/${jobId}`
  );

  redirect(`/jobs/${jobId}?tab=invite&invited=1`);
}

// Client starts (or reopens) a direct conversation with a freelancer about a
// job — this is what makes the freelancer an "active candidate". Creates the
// job-scoped conversation if it doesn't exist yet, then opens the chat.
export async function messageFreelancer(jobId: string, freelancerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only the job's owner can start a chat from its proposals.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id) redirect(`/jobs/${jobId}`);

  // Reuse the existing conversation for this job + pair if there is one.
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2")
    .eq("job_id", jobId)
    .or(
      `and(participant_1.eq.${user.id},participant_2.eq.${freelancerId}),and(participant_1.eq.${freelancerId},participant_2.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  let convoId = existing?.id as string | undefined;
  if (!convoId) {
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        job_id: jobId,
        participant_1: user.id,
        participant_2: freelancerId,
      })
      .select("id")
      .single();
    convoId = created?.id;
  }

  if (!convoId) redirect(`/jobs/${jobId}?tab=proposals`);

  // Seed the freelancer's cover letter as the opening message (no-ops if the
  // conversation already has messages or there's no proposal).
  const { seedProposalIntroMessage } = await import("@/lib/chat-seed");
  await seedProposalIntroMessage(convoId, jobId, freelancerId);

  redirect(`/messages/${convoId}`);
}

// Delete a job the client owns.
export async function deleteJob(jobId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Grab the job title and every freelancer with an open (non-withdrawn)
  // proposal BEFORE deleting, so we can let them know it's gone.
  const { data: job } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .eq("client_id", user.id)
    .maybeSingle();
  const { data: applicants } = await supabase
    .from("proposals")
    .select("freelancer_id")
    .eq("job_id", jobId)
    .neq("status", "withdrawn");

  await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("client_id", user.id);

  await notify(
    supabase,
    user.id,
    "system",
    "Job post removed",
    "Your job posting has been removed.",
    "/my-jobs"
  );

  // Notify each freelancer who had applied that the job was closed.
  const jobTitle = job?.title ?? "a job";
  for (const a of applicants ?? []) {
    await notify(
      supabase,
      a.freelancer_id,
      "proposal",
      "A job you applied to was closed",
      `The client closed "${jobTitle}", so your proposal is no longer active.`,
      "/proposals"
    );
  }

  redirect("/dashboard");
}
