"use server";

import { createClient } from "@/lib/supabase-server";
import { detectOffPlatform, recordWarning } from "@/lib/moderation";
import { isRateLimited } from "@/lib/rate-limit";
import { notify } from "@/lib/notify";

// Authorization guard: true only when the user is one of the two participants
// of the conversation. Chat actions take a client-supplied conversationId, so
// each must confirm membership before reading/writing — otherwise a user could
// inject messages into, or mark read, strangers' threads.
async function isConversationMember(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  conversationId: string
): Promise<boolean> {
  const { data: c } = await supabase
    .from("conversations")
    .select("participant_1, participant_2")
    .eq("id", conversationId)
    .maybeSingle();
  return !!c && (c.participant_1 === userId || c.participant_2 === userId);
}

// Mark the OTHER participant's messages in a conversation as read. Callable
// from the client so read receipts update LIVE while the chat is open (not just
// on page load) — the resulting UPDATE broadcasts over realtime so the sender
// sees "Seen" immediately. Symmetric for both client and freelancer.
export async function markConversationRead(
  conversationId: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    if (!(await isConversationMember(supabase, user.id, conversationId)))
      return { ok: false };
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("read", false);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// Notify the OTHER participant of a conversation about a new message. Creates
// an in-app notification and (once an email sender is configured) an email,
// both gated by the recipient's "Messages" notification preference. Best-effort
// — a failure here never blocks the message from being sent.
async function notifyRecipient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversationId: string,
  senderId: string,
  preview: string
) {
  try {
    const { data: convo } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", conversationId)
      .maybeSingle();
    const recipientId = convo
      ? convo.participant_1 === senderId
        ? convo.participant_2
        : convo.participant_1
      : null;
    if (!recipientId) return;
    const { data: sender } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", senderId)
      .maybeSingle();
    await notify(
      supabase,
      recipientId,
      "message",
      `New message from ${sender?.full_name || "someone"}`,
      preview,
      `/messages/${conversationId}`
    );
  } catch {
    /* never block sending on a notification failure */
  }
}

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

  // Authorization: only a participant of this conversation may post to it.
  if (!(await isConversationMember(supabase, user.id, conversationId)))
    return { ok: false, error: "You're not part of this conversation." };

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

  await notifyRecipient(
    supabase,
    conversationId,
    user.id,
    text.length > 140 ? `${text.slice(0, 140)}…` : text
  );
  return { ok: true, message: data };
}

// Send a message to a freelancer from the client's "Review proposals" page
// WITHOUT leaving the page (powers the quick-message popup). Resolves — or
// creates — the per-job conversation, then reuses sendChatMessage so all the
// moderation / rate-limit / block / notify logic stays in one place.
export async function quickMessageOnJob(
  jobId: string,
  freelancerId: string,
  content: string
): Promise<SendResult & { convoId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  // Only the job's owner (the client) may start a chat from its proposals.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id)
    return { ok: false, error: "You can't message on this job." };

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
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
  if (!convoId) return { ok: false, error: "Couldn't open the conversation." };

  const res = await sendChatMessage(convoId, content);
  return { ...res, convoId };
}

// Load the existing conversation with a freelancer on a job (for the client's
// quick-message popup, so it opens as a mini-inbox showing prior messages
// instead of a blank box). Returns [] if there's no conversation yet.
export async function getQuickThread(
  jobId: string,
  freelancerId: string
): Promise<{
  convoId: string | null;
  messages: {
    id: string;
    content: string;
    mine: boolean;
    system: boolean;
    created_at: string;
  }[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { convoId: null, messages: [] };

  const { data: job } = await supabase
    .from("jobs")
    .select("client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.client_id !== user.id) return { convoId: null, messages: [] };

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", jobId)
    .or(
      `and(participant_1.eq.${user.id},participant_2.eq.${freelancerId}),and(participant_1.eq.${freelancerId},participant_2.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();
  if (!convo) return { convoId: null, messages: [] };

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at, kind")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true })
    .limit(50);

  // Opening the popup counts as reading — clear the unread badge so it doesn't
  // pop back on the next refresh.
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", convo.id)
    .neq("sender_id", user.id)
    .eq("read", false);

  return {
    convoId: convo.id as string,
    messages: (msgs ?? []).map((m) => ({
      id: m.id as string,
      content: (m.content as string) || "",
      mine: m.sender_id === user.id,
      system: m.kind === "system",
      created_at: m.created_at as string,
    })),
  };
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

  // Authorization: only a participant of this conversation may post to it.
  if (!(await isConversationMember(supabase, user.id, conversationId)))
    return { ok: false, error: "You're not part of this conversation." };

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

  await notifyRecipient(
    supabase,
    conversationId,
    user.id,
    `📎 Sent an attachment${attachmentName ? `: ${attachmentName}` : ""}`
  );
  return { ok: true, message: data };
}
