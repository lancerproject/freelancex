"use server";

import { createClient } from "@/lib/supabase-server";

export type JobActivityCounts = {
  proposals: number; // exact number of proposals (bucketed for display)
  interviewing: number; // freelancers in a conversation with the client for this job
  invitesSent: number; // freelancers invited to this job
  unanswered: number; // invited freelancers who haven't responded yet
  hired: number; // freelancers the client has hired for this job
};

// Computes the live "Activity on this job" numbers from the database.
export async function getJobActivity(jobId: string): Promise<JobActivityCounts> {
  const supabase = await createClient();

  const [proposalsRes, invitesRes, convosRes, hiredRes, jobRes] =
    await Promise.all([
      supabase
        .from("proposals")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId),
      // Invites are recorded as "invite" notifications linking to the job.
      supabase
        .from("notifications")
        .select("user_id")
        .eq("type", "invite")
        .eq("link", `/jobs/${jobId}`),
      // A conversation tied to the job = the client is talking with that freelancer.
      supabase
        .from("conversations")
        .select("participant_1, participant_2")
        .eq("job_id", jobId),
      // Hired = the freelancers whose proposal the client accepted.
      supabase
        .from("proposals")
        .select("freelancer_id")
        .eq("job_id", jobId)
        .eq("status", "accepted"),
      supabase.from("jobs").select("client_id").eq("id", jobId).maybeSingle(),
    ]);

  const invitedIds = Array.from(
    new Set((invitesRes.data ?? []).map((n) => n.user_id as string))
  );
  const convos = convosRes.data ?? [];
  const hiredIds = new Set(
    (hiredRes.data ?? []).map((r) => r.freelancer_id as string)
  );
  const clientId = jobRes.data?.client_id as string | undefined;

  // In a job conversation, the freelancer is the participant who isn't the client.
  const freelancerOf = (c: { participant_1: string; participant_2: string }) =>
    c.participant_1 === clientId ? c.participant_2 : c.participant_1;

  // Interviewing = conversations with a freelancer who HASN'T been hired yet.
  // Once hired, they move out of "Interviewing" and only count under "Hired".
  const interviewing = convos.filter(
    (c) => !hiredIds.has(freelancerOf(c))
  ).length;

  // Which invited freelancers have responded (i.e. now have a conversation).
  const participants = new Set<string>(
    convos.flatMap((c) => [c.participant_1, c.participant_2])
  );
  const respondedInvited = invitedIds.filter((id) => participants.has(id)).length;
  const unanswered = Math.max(0, invitedIds.length - respondedInvited);

  return {
    proposals: proposalsRes.count ?? 0,
    interviewing,
    invitesSent: invitedIds.length,
    unanswered,
    hired: hiredIds.size,
  };
}
