"use server";

import { createClient } from "@/lib/supabase-server";
import { detectOffPlatform, recordWarning } from "@/lib/moderation";
import { isRateLimited } from "@/lib/rate-limit";

export type SendResult = {
  ok: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message?: any;
  blocked?: boolean; // message blocked for an off-platform attempt
  suspended?: boolean; // sender is (now) suspended
  warnings?: number;
  reason?: string;
  error?: string;
};

// True when a chat block exists in EITHER direction between the sender and
// the other participant of the conversation. Checked with the service role —
// who blocked whom is never readable client-side.
async function conversationBlocked(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  senderId: string,
  conversationId: string
): Promise<boolean> {
  try {
    const { data: convo } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", conversationId)
      .maybeSingle();
    if (!convo) return false;
    const other =
      convo.participant_1 === senderId
        ? convo.participant_2
        : convo.participant_1;
    if (!other) return false;

    const { createAdminClient } = await import("@/lib/supabase-admin");
    const { data: block } = await createAdminClient()
      .from("user_blocks")
      .select("id")
      .or(
        `and(blocker_id.eq.${senderId},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${senderId})`
      )
      .limit(1)
      .maybeSingle();
    return !!block;
  } catch {
    return false; // pre-migration — no blocks exist yet
  }
}

// Sends a chat message AFTER moderation. Off-platform attempts (emails, phone
// numbers, links, outside-payment talk) are blocked — the message is never
// delivered — counted as a policy warning, and recorded as a violation on the
// sender's account health. The 5th warning permanently suspends the account.
export async function sendChatMessage(
  conversationId: string,
  content: string
): Promise<SendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const text = (content || "").trim();
  if (!text) return { ok: false, error: "Message is empty." };

  // Suspended accounts can't send messages.
  const { data: me } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.suspended) return { ok: false, suspended: true };

  // A chat block (either direction) silences new messages.
  if (await conversationBlocked(supabase, user.id, conversationId)) {
    return {
      ok: false,
      error: "Messaging is unavailable in this conversation.",
    };
  }

  // Rate limit: at most ~20 messages per 30s per sender.
  if (await isRateLimited(supabase, "messages", "sender_id", user.id, 30, 20)) {
    return {
      ok: false,
      error: "You're sending messages too quickly. Please wait a moment.",
    };
  }

  // Moderation: block off-platform attempts and record a warning + violation.
  const det = detectOffPlatform(text);
  if (det.flagged) {
    const res = await recordWarning(supabase, user.id, det.reason, det.category);
    return {
      ok: false,
      blocked: true,
      reason: det.reason,
      warnings: res.warnings,
      suspended: res.suspended,
    };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content: text })
    .select("id, sender_id, content, created_at")
    .single();

  if (error || !data) return { ok: false, error: "Couldn't send your message." };
  return { ok: true, message: data };
}

// Sends a file attachment as a message. The file is already uploaded to storage
// by the client; here we just record the message row (with moderation skipped —
// there's no text to scan — but suspension and rate limits still apply).
export async function sendChatAttachment(
  conversationId: string,
  attachmentUrl: string,
  attachmentName: string
): Promise<SendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  if (!attachmentUrl) return { ok: false, error: "No file to send." };

  const { data: me } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.suspended) return { ok: false, suspended: true };

  // A chat block (either direction) silences new messages.
  if (await conversationBlocked(supabase, user.id, conversationId)) {
    return {
      ok: false,
      error: "Messaging is unavailable in this conversation.",
    };
  }

  if (await isRateLimited(supabase, "messages", "sender_id", user.id, 30, 20)) {
    return {
      ok: false,
      error: "You're sending messages too quickly. Please wait a moment.",
    };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: "",
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    })
    .select("id, sender_id, content, created_at, attachment_url, attachment_name")
    .single();

  if (error || !data) return { ok: false, error: "Couldn't send the file." };
  return { ok: true, message: data };
}
