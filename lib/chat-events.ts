// Post a system "event" line into a contract's job conversation so BOTH
// parties see the full lifecycle — offers, milestones, funding, submissions,
// approvals, refunds, disputes, feedback, ending — right in the chat room,
// alongside "seen" receipts and online status. Best-effort: it must never
// throw into or slow down the action that called it (those already redirect).
//
// Conversations are keyed on (job_id, participants), so we resolve the room
// from the contract's job + the freelancer. Pass the *user-scoped* supabase
// client (the actor is a participant, so RLS on messages.insert is satisfied).

type EventContract = {
  job_id?: string | null;
  freelancer_id?: string | null;
  client_id?: string | null;
};

export async function postContractEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contract: EventContract | null | undefined,
  actorId: string,
  text: string
): Promise<void> {
  try {
    const jobId = contract?.job_id;
    const freelancerId = contract?.freelancer_id;
    if (!jobId || !freelancerId) return;

    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .eq("job_id", jobId)
      .or(
        `participant_1.eq.${freelancerId},participant_2.eq.${freelancerId}`
      )
      .limit(1)
      .maybeSingle();
    if (!convo) return;

    await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: actorId,
      kind: "system",
      content: text,
    });
  } catch {
    /* best-effort — never block the caller */
  }
}
