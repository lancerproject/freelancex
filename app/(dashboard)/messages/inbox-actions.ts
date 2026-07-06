"use server";

// Inbox actions — chat-rules consent, out-of-office, per-conversation prefs
// (pin/favorite/hide), ended conversations, saved messages, and freelancer
// contract proposals.

import { createClient } from "@/lib/supabase-server";
import { notify } from "@/lib/notify";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Membership guard: the caller must be a participant of the conversation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function myConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  conversationId: string
) {
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, job_id, contract_id, participant_1, participant_2, ended_at, ended_by"
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (!data) return null;
  if (data.participant_1 !== userId && data.participant_2 !== userId)
    return null;
  return data;
}

// One-time chat safety-rules consent (blocking modal on first use).
export async function acceptChatRules(): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  await supabase
    .from("profiles")
    .update({ chat_rules_accepted_at: new Date().toISOString() })
    .eq("id", user.id);
  return { ok: true };
}

// Message settings (from the in-chat popup): presence toggle + the
// "messages" notification category (in-app / email). Merges into the same
// notification_prefs jsonb the Settings page uses, so the two never disagree.
export async function saveMessageSettings(params: {
  online: boolean;
  inapp: boolean;
  email: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: prof } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();
  const prefs =
    prof?.notification_prefs && typeof prof.notification_prefs === "object"
      ? { ...prof.notification_prefs }
      : {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prefs as any).messages = { inapp: params.inapp, email: params.email };

  const { error } = await supabase
    .from("profiles")
    .update({
      online_for_messages: params.online,
      notification_prefs: prefs,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Couldn't save. Please try again." };
  return { ok: true };
}

// Out of office — while on, others see an amber "Away" presence state.
export async function setOutOfOffice(
  on: boolean,
  until?: string | null
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  await supabase
    .from("profiles")
    .update({
      out_of_office: on,
      out_of_office_until: on && until ? until : null,
    })
    .eq("id", user.id);
  return { ok: true };
}

// Pin / favorite / hide a conversation (per-user, upserted).
export async function setConvoPref(
  conversationId: string,
  patch: { pinned?: boolean; favorite?: boolean; hidden?: boolean }
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  const convo = await myConversation(supabase, user.id, conversationId);
  if (!convo) return { ok: false };

  const { data: existing } = await supabase
    .from("conversation_prefs")
    .select("id")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("conversation_prefs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("conversation_prefs").insert({
      user_id: user.id,
      conversation_id: conversationId,
      pinned: false,
      favorite: false,
      hidden: false,
      ...patch,
    });
  }
  return { ok: true };
}

// Personal notepad — a private per-conversation note only the author sees.
export async function saveConversationNote(
  conversationId: string,
  note: string
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  const convo = await myConversation(supabase, user.id, conversationId);
  if (!convo) return { ok: false };

  const trimmed = (note || "").slice(0, 5000);
  const { data: existing } = await supabase
    .from("conversation_prefs")
    .select("id")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("conversation_prefs")
      .update({ note: trimmed || null, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("conversation_prefs").insert({
      user_id: user.id,
      conversation_id: conversationId,
      note: trimmed || null,
    });
  }
  return { ok: true };
}

// End a conversation for both sides (input disabled; system note in thread).
export async function endConversation(
  conversationId: string
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  const convo = await myConversation(supabase, user.id, conversationId);
  if (!convo || convo.ended_at) return { ok: false };

  await supabase
    .from("conversations")
    .update({ ended_at: new Date().toISOString(), ended_by: user.id })
    .eq("id", conversationId);
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    kind: "system",
    content: "This conversation was ended.",
  });
  return { ok: true };
}

// Reopen a conversation you ended.
export async function reopenConversation(
  conversationId: string
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  const convo = await myConversation(supabase, user.id, conversationId);
  if (!convo || !convo.ended_at || convo.ended_by !== user.id) {
    return { ok: false };
  }
  await supabase
    .from("conversations")
    .update({ ended_at: null, ended_by: null })
    .eq("id", conversationId);
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    kind: "system",
    content: "This conversation was reopened.",
  });
  return { ok: true };
}

// Jump to (or create) the plain 1:1 conversation with the same person —
// no job, no contract attached.
export async function goToDirectConversation(
  otherId: string
): Promise<{ ok: boolean; conversationId?: string }> {
  const { supabase, user } = await authed();
  if (!user || !otherId || otherId === user.id) return { ok: false };

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${user.id},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${user.id})`
    )
    .is("job_id", null)
    .is("contract_id", null)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, conversationId: existing.id };

  const { data: created } = await supabase
    .from("conversations")
    .insert({ participant_1: user.id, participant_2: otherId })
    .select("id")
    .single();
  if (!created) return { ok: false };
  return { ok: true, conversationId: created.id };
}

// Star / unstar a message (saved messages).
export async function toggleSaveMessage(
  messageId: string,
  conversationId: string,
  save: boolean
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  const convo = await myConversation(supabase, user.id, conversationId);
  if (!convo) return { ok: false };

  if (save) {
    await supabase.from("saved_messages").upsert(
      {
        user_id: user.id,
        message_id: messageId,
        conversation_id: conversationId,
      },
      { onConflict: "user_id,message_id" }
    );
  } else {
    await supabase
      .from("saved_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("message_id", messageId);
  }
  return { ok: true };
}

// Freelancer proposes a contract to the client. Creates a contract_requests
// row plus a chat card; the client responds by sending a real (prefilled)
// offer or declining.
export async function proposeContract(params: {
  conversationId: string;
  title: string;
  amount: number;
  rateType: string;
  duration?: string;
  description: string;
  milestones?: { name: string; amount: number; due_date?: string }[];
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "You're not signed in." };
  const convo = await myConversation(supabase, user.id, params.conversationId);
  if (!convo) return { ok: false, error: "Conversation not found." };
  if (convo.ended_at)
    return { ok: false, error: "This conversation has ended." };

  const title = (params.title || "").trim();
  const description = (params.description || "").trim();
  const amount = Number(params.amount) || 0;
  if (!title) return { ok: false, error: "Give your proposal a title." };
  if (amount <= 0) return { ok: false, error: "Enter a valid amount." };
  if (!description)
    return { ok: false, error: "Describe the work you're proposing." };

  // Only a freelancer proposes; the other participant is the client.
  const { data: me } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "freelancer") {
    return { ok: false, error: "Only freelancers can propose contracts." };
  }
  const clientId =
    convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;

  const milestones = (params.milestones ?? []).filter(
    (m) => (m.name || "").trim() && Number(m.amount) > 0
  );

  const { data: request, error } = await supabase
    .from("contract_requests")
    .insert({
      conversation_id: params.conversationId,
      job_id: convo.job_id ?? null,
      client_id: clientId,
      freelancer_id: user.id,
      title,
      amount,
      rate_type: params.rateType === "hourly" ? "hourly" : "fixed",
      duration: (params.duration || "").trim() || null,
      description,
      milestones: milestones.length ? milestones : null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !request) {
    return { ok: false, error: "Couldn't send the proposal. Please try again." };
  }

  // Chat card — content mirrors the request status so realtime UPDATEs flip
  // the card in place (same pattern as offer cards).
  await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: user.id,
    kind: "contract_request",
    request_id: request.id,
    content: "pending",
  });

  await notify(
    supabase,
    clientId,
    "message",
    `📝 ${me?.full_name || "A freelancer"} proposed a contract`,
    `"${title}" — $${amount}${params.rateType === "hourly" ? "/hr" : ""}. Review it in your chat and send an offer if it works for you.`,
    `/messages/${params.conversationId}`
  );

  return { ok: true };
}

// Any contract that counts as an ACTIVE working relationship between two
// users — while one exists, neither side may block the other.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hasWorkingContract(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  a: string,
  b: string
): Promise<boolean> {
  const { data } = await supabase
    .from("contracts")
    .select("id, status")
    .or(
      `and(client_id.eq.${a},freelancer_id.eq.${b}),and(client_id.eq.${b},freelancer_id.eq.${a})`
    )
    .in("status", ["active", "disputed"])
    .limit(1)
    .maybeSingle();
  return !!data;
}

// Block a user from chat. Refused while the two have an active contract.
// Blocking silences NEW messages in both directions; history stays visible.
export async function blockUser(
  otherId: string,
  conversationId: string
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "You're not signed in." };
  if (!otherId || otherId === user.id) return { ok: false, error: "Invalid user." };
  const convo = await myConversation(supabase, user.id, conversationId);
  if (
    !convo ||
    (convo.participant_1 !== otherId && convo.participant_2 !== otherId)
  ) {
    return { ok: false, error: "Conversation not found." };
  }

  if (await hasWorkingContract(supabase, user.id, otherId)) {
    return {
      ok: false,
      error:
        "You can't block someone you have an active contract with. Complete or resolve the contract first.",
    };
  }

  const { error } = await supabase.from("user_blocks").upsert(
    { blocker_id: user.id, blocked_id: otherId },
    { onConflict: "blocker_id,blocked_id" }
  );
  if (error) return { ok: false, error: "Couldn't block this user. Please try again." };
  return { ok: true };
}

// Unblock a user you previously blocked.
export async function unblockUser(
  otherId: string
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };
  await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherId);
  return { ok: true };
}

// Client declines a contract proposal (soft — freelancer sees the status flip).
export async function declineContractRequest(
  requestId: string
): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false };

  const { data: request } = await supabase
    .from("contract_requests")
    .select("id, client_id, freelancer_id, conversation_id, title, status")
    .eq("id", requestId)
    .maybeSingle();
  if (
    !request ||
    request.client_id !== user.id ||
    request.status !== "pending"
  ) {
    return { ok: false };
  }

  await supabase
    .from("contract_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", requestId);
  // Flip the chat card in place (realtime UPDATE).
  await supabase
    .from("messages")
    .update({ content: "declined" })
    .eq("request_id", requestId)
    .eq("kind", "contract_request");

  await notify(
    supabase,
    request.freelancer_id,
    "message",
    "Your contract proposal was declined",
    `The client passed on "${request.title}" for now. You can keep the conversation going or propose different terms.`,
    `/messages/${request.conversation_id}`
  );
  return { ok: true };
}
