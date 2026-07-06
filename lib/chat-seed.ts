// Seeds a brand-new job conversation with the freelancer's proposal cover
// letter as their first message (kind='proposal_intro'), exactly like the
// proposal opening a chat on Upwork. The chat then shows a "View details"
// card under it linking to the proposal.
//
// Uses the service role: the seed is inserted AS the freelancer even though
// the conversation is usually created by the client (RLS would block that).

import { createAdminClient } from "./supabase-admin";

export async function seedProposalIntroMessage(
  conversationId: string,
  jobId: string | null | undefined,
  freelancerId: string | null | undefined
): Promise<void> {
  if (!conversationId || !jobId || !freelancerId) return;
  try {
    const admin = createAdminClient();

    // Only seed a conversation that has no messages yet.
    const { count } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId);
    if ((count ?? 0) > 0) return;

    const { data: proposal } = await admin
      .from("proposals")
      .select("id, cover_letter")
      .eq("job_id", jobId)
      .eq("freelancer_id", freelancerId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!proposal?.cover_letter) return;

    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: freelancerId,
      kind: "proposal_intro",
      content: proposal.cover_letter,
    });
  } catch {
    /* pre-migration or hiccup — the chat simply starts empty */
  }
}
