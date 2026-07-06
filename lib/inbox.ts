// Inbox data for the Messages pages — one shared loader so the conversation
// rail is identical on /messages and /messages/[id].
//
// Enriches each conversation with: the other participant (presence + away
// state), the last message preview, the unread incoming count, the viewer's
// prefs (pinned / favorite / hidden), and a type used by the filters:
//   interview = job chat before any contract · contract = tied to a contract
//   direct    = plain 1:1 (no job, no contract)

/* eslint-disable @typescript-eslint/no-explicit-any */

export type InboxType = "interview" | "contract" | "direct";

export type InboxItem = {
  id: string;
  type: InboxType;
  jobId: string | null;
  jobTitle: string | null;
  contractId: string | null;
  contractTitle: string | null;
  endedAt: string | null;
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  otherOnline: boolean;
  otherAway: boolean; // out-of-office
  lastPreview: string;
  lastAt: string | null; // last message time (falls back to convo created_at)
  lastFromMe: boolean;
  unread: number;
  pinned: boolean;
  favorite: boolean;
  hidden: boolean;
};

export type SavedItem = {
  id: string; // saved_messages row id
  messageId: string;
  conversationId: string;
  senderName: string;
  preview: string;
  createdAt: string | null; // message time
};

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// Short human preview for any message kind.
export function messagePreview(m: {
  kind?: string | null;
  content?: string | null;
  attachment_name?: string | null;
}): string {
  switch (m.kind) {
    case "offer":
      return "🎉 Job offer";
    case "contract_request":
      return "📝 Contract proposal";
    case "attachment":
      return `📎 ${m.attachment_name || "Attachment"}`;
    case "system":
      return m.content || "";
    default:
      return m.content || (m.attachment_name ? `📎 ${m.attachment_name}` : "");
  }
}

export async function getInbox(
  supabase: any,
  userId: string
): Promise<{ items: InboxItem[]; saved: SavedItem[] }> {
  const { data: convosData } = await supabase
    .from("conversations")
    .select(
      "id, job_id, contract_id, participant_1, participant_2, created_at, ended_at, jobs ( id, title ), contract:contracts ( id, title )"
    )
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("created_at", { ascending: false });
  const convos: any[] = convosData ?? [];
  if (convos.length === 0) return { items: [], saved: [] };

  const convoIds = convos.map((c) => c.id);
  const otherIds = Array.from(
    new Set(
      convos
        .map((c) => (c.participant_1 === userId ? c.participant_2 : c.participant_1))
        .filter(Boolean)
    )
  );

  const [
    { data: profilesData },
    { data: recentMsgs },
    { data: unreadRows },
    { data: prefsData },
    { data: savedData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, avatar_url, online_for_messages, out_of_office, timezone"
      )
      .in("id", otherIds),
    // Recent messages across all conversations — enough to find each convo's
    // latest message (fetched newest-first).
    supabase
      .from("messages")
      .select(
        "conversation_id, sender_id, content, kind, attachment_name, created_at"
      )
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: false })
      .limit(600),
    // Unread incoming messages (read=false, not sent by me).
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .neq("sender_id", userId)
      .eq("read", false),
    supabase
      .from("conversation_prefs")
      .select("conversation_id, pinned, favorite, hidden")
      .eq("user_id", userId),
    supabase
      .from("saved_messages")
      .select(
        "id, message_id, conversation_id, message:messages ( content, kind, attachment_name, sender_id, created_at )"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const profById: Record<string, any> = {};
  for (const p of profilesData ?? []) profById[p.id] = p;

  const lastByConvo: Record<string, any> = {};
  for (const m of recentMsgs ?? []) {
    if (!lastByConvo[m.conversation_id]) lastByConvo[m.conversation_id] = m;
  }

  const unreadByConvo: Record<string, number> = {};
  for (const r of unreadRows ?? []) {
    unreadByConvo[r.conversation_id] =
      (unreadByConvo[r.conversation_id] ?? 0) + 1;
  }

  const prefsByConvo: Record<string, any> = {};
  for (const p of prefsData ?? []) prefsByConvo[p.conversation_id] = p;

  const items: InboxItem[] = convos.map((c) => {
    const otherId =
      c.participant_1 === userId ? c.participant_2 : c.participant_1;
    const prof = profById[otherId] ?? {};
    const job = one<any>(c.jobs);
    const contract = one<any>(c.contract);
    const last = lastByConvo[c.id];
    const prefs = prefsByConvo[c.id] ?? {};
    const type: InboxType = c.contract_id
      ? "contract"
      : c.job_id
        ? "interview"
        : "direct";
    return {
      id: c.id,
      type,
      jobId: job?.id ?? c.job_id ?? null,
      jobTitle: job?.title ?? null,
      contractId: contract?.id ?? c.contract_id ?? null,
      contractTitle: contract?.title ?? null,
      endedAt: c.ended_at ?? null,
      otherId,
      otherName: prof.full_name || "User",
      otherAvatar: prof.avatar_url ?? null,
      otherOnline: !!prof.online_for_messages,
      otherAway: !!prof.out_of_office,
      lastPreview: last ? messagePreview(last) : "No messages yet",
      lastAt: last?.created_at ?? c.created_at ?? null,
      lastFromMe: last ? last.sender_id === userId : false,
      unread: unreadByConvo[c.id] ?? 0,
      pinned: !!prefs.pinned,
      favorite: !!prefs.favorite,
      hidden: !!prefs.hidden,
    };
  });

  // Pinned first, then latest activity.
  items.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.lastAt ?? "").localeCompare(a.lastAt ?? "");
  });

  const saved: SavedItem[] = (savedData ?? []).map((s: any) => {
    const m = one<any>(s.message) ?? {};
    const senderProf = profById[m.sender_id];
    return {
      id: s.id,
      messageId: s.message_id,
      conversationId: s.conversation_id,
      senderName:
        m.sender_id === userId ? "You" : senderProf?.full_name || "User",
      preview: messagePreview(m),
      createdAt: m.created_at ?? null,
    };
  });

  return { items, saved };
}
