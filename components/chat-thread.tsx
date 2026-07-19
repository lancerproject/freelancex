"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  sendChatMessage,
  sendChatAttachment,
  markConversationRead,
} from "@/app/(dashboard)/messages/actions";
import {
  toggleSaveMessage,
  reopenConversation,
} from "@/app/(dashboard)/messages/inbox-actions";
import {
  ChatOfferCard,
  SystemChatMessage,
  type ChatOffer,
} from "@/components/chat-offer-card";
import {
  ContractRequestCard,
  type ChatContractRequest,
} from "@/components/contract-request-card";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read?: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  kind?: string | null; // 'text' | 'attachment' | 'offer' | 'system' | 'contract_request'
  offer_id?: string | null;
  request_id?: string | null;
};

// ---------------------------------------------------------------------------
// Markdown-lite: **bold** and _italic_ only, applied per line. Pure React
// nodes — no HTML injection possible.
// ---------------------------------------------------------------------------
function renderRich(content: string): React.ReactNode {
  const lines = (content || "").split("\n");
  return lines.map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {renderLine(line)}
    </span>
  ));
}

function renderLine(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenize **bold** and _italic_ (non-greedy, must have content).
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) out.push(line.slice(last, match.index));
    const tok = match[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = match.index + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

const EMOJIS = [
  "😀", "😄", "😊", "🙂", "😉", "😍", "🤝", "👍",
  "👋", "🙏", "👏", "💪", "🎉", "🔥", "⭐", "✅",
  "❤️", "💜", "😅", "😂", "🤔", "👀", "💡", "📌",
  "📁", "🕒", "☕", "🚀", "💰", "📈", "✍️", "🙌",
];

export function ChatThread({
  conversationId,
  userId,
  myName,
  otherName,
  initial,
  suspended = false,
  offersById = {},
  requestsById = {},
  savedIds = [],
  endedAt = null,
  endedByMe = false,
  blockedByMe = false,
  blockedMe = false,
  proposalDetailsHref = null,
}: {
  conversationId: string;
  userId: string;
  myName: string;
  otherName: string;
  initial: Message[];
  suspended?: boolean;
  // Offer details for kind='offer' messages, keyed by offer id. The card's
  // status comes from the message content (live via realtime UPDATE).
  offersById?: Record<string, ChatOffer & { viewerIsFreelancer: boolean }>;
  // Contract proposals for kind='contract_request' messages, keyed by request id.
  requestsById?: Record<string, ChatContractRequest & { viewerIsClient: boolean }>;
  // Message ids this viewer has saved (☆).
  savedIds?: string[];
  // Ended conversations disable the input for both sides.
  endedAt?: string | null;
  endedByMe?: boolean;
  // Chat blocks (either direction) disable the input too.
  blockedByMe?: boolean;
  blockedMe?: boolean;
  // Where the "View details" card under the proposal-intro message goes
  // (freelancer → their proposal page; client → the job's proposals tab).
  proposalDetailsHref?: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds));
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [blocked, setBlocked] = useState(suspended);
  const [notice, setNotice] = useState<{
    kind: "warning" | "suspended";
    text: string;
  } | null>(
    suspended
      ? {
          kind: "suspended",
          text: "Your account is suspended, so you can no longer send messages.",
        }
      : null
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = getBrowserSupabase();
  const ended = !!endedAt;

  // Typing indicator (Supabase broadcast channel).
  const [otherTyping, setOtherTyping] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingChanRef = useRef<any>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef(0);
  const sendTyping = () => {
    const now = Date.now();
    if (now - lastTypingRef.current < 1500) return; // throttle broadcasts
    lastTypingRef.current = now;
    typingChanRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  };

  // Live updates — append any new message in this conversation.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Message }) => {
          const m = payload.new;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        // Read receipts + offer/request card status flips: merge the changed
        // fields in place (content carries the live status).
        (payload: { new: Message }) => {
          const m = payload.new;
          setMessages((prev) =>
            prev.map((x) =>
              x.id === m.id ? { ...x, read: m.read, content: m.content } : x
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Typing indicator — a lightweight broadcast channel separate from the DB
  // changes above. When the other participant types, show "typing…" for ~3s.
  useEffect(() => {
    const chan = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    chan
      .on(
        "broadcast",
        { event: "typing" },
        (msg: { payload?: { userId?: string } }) => {
          if (msg.payload?.userId && msg.payload.userId !== userId) {
            setOtherTyping(true);
            if (typingClearRef.current) clearTimeout(typingClearRef.current);
            typingClearRef.current = setTimeout(
              () => setOtherTyping(false),
              3000
            );
          }
        }
      )
      .subscribe();
    typingChanRef.current = chan;
    return () => {
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      supabase.removeChannel(chan);
      typingChanRef.current = null;
    };
  }, [conversationId, supabase, userId]);

  // Mark the other person's messages read as soon as they're on screen (on
  // mount and whenever a new one arrives via realtime), so the SENDER sees
  // "Seen" live — works the same for client and freelancer. We optimistically
  // flip them locally so this doesn't re-fire; the sender gets the real read
  // state from the UPDATE this broadcasts.
  useEffect(() => {
    const hasUnreadIncoming = messages.some(
      (m) => m.sender_id !== userId && !m.read
    );
    if (!hasUnreadIncoming) return;
    markConversationRead(conversationId).catch(() => {});
    setMessages((prev) =>
      prev.map((m) =>
        m.sender_id !== userId && !m.read ? { ...m, read: true } : m
      )
    );
  }, [messages, conversationId, userId]);

  // Deep link: /messages/{id}#msg-{messageId} scrolls to and highlights it.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#msg-")) {
      const id = hash.slice(5);
      setHighlightId(id);
      setTimeout(() => {
        document
          .getElementById(`msg-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      const t = setTimeout(() => setHighlightId(null), 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to the newest message (skip when deep-linking).
  useEffect(() => {
    if (!window.location.hash.startsWith("#msg-")) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const doSend = async () => {
    const content = text.trim();
    if (!content || sending || blocked || ended) return;
    setSending(true);

    // .catch so a rejected action can't leave `sending` stuck true (which would
    // permanently disable the composer until a page reload).
    const res = await sendChatMessage(conversationId, content).catch(
      (): Awaited<ReturnType<typeof sendChatMessage>> => ({
        ok: false,
        error: "Couldn't send your message. Please try again.",
      })
    );

    if (res.ok && res.message) {
      setText("");
      setNotice(null);
      const m = res.message as Message;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m]
      );
    } else if (res.blocked) {
      // Off-platform attempt — message NOT sent, warning recorded.
      if (res.suspended) {
        setBlocked(true);
        setNotice({
          kind: "suspended",
          text: "That was your final policy warning. Your account has been suspended and you can no longer send messages.",
        });
      } else {
        setNotice({
          kind: "warning",
          text: `${res.reason} Please keep contact details and payments on Xwork. Warning ${res.warnings} of 5 — after 5 warnings your account is permanently suspended.`,
        });
      }
      // keep the text so the user can edit it
    } else if (res.suspended) {
      setBlocked(true);
      setNotice({
        kind: "suspended",
        text: "Your account is suspended, so you can no longer send messages.",
      });
    } else if (res.error) {
      setNotice({ kind: "warning", text: res.error });
    }

    setSending(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSend();
  };

  // Enter sends, Shift+Enter adds a new line (per the shortcuts modal).
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void doSend();
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // allow re-picking same file
    if (!file || blocked || ended) return;

    if (file.size > 25 * 1024 * 1024) {
      setNotice({ kind: "warning", text: "Files must be 25 MB or smaller." });
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `chat/${conversationId}/${userId}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("project-files")
      .upload(path, file, { upsert: true });

    if (upErr) {
      setUploading(false);
      setNotice({
        kind: "warning",
        text: "Couldn't upload that file. Please try again.",
      });
      return;
    }

    const { data: pub } = supabase.storage
      .from("project-files")
      .getPublicUrl(path);
    const res = await sendChatAttachment(
      conversationId,
      pub.publicUrl,
      file.name
    ).catch(
      (): Awaited<ReturnType<typeof sendChatAttachment>> => ({
        ok: false,
        error: "Couldn't send the file. Please try again.",
      })
    );
    setUploading(false);

    if (res.ok && res.message) {
      setNotice(null);
      const m = res.message as Message;
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m]
      );
    } else if (res.suspended) {
      setBlocked(true);
      setNotice({
        kind: "suspended",
        text: "Your account is suspended, so you can no longer send messages.",
      });
    } else if (res.error) {
      setNotice({ kind: "warning", text: res.error });
    }
  };

  // Wrap the current selection (or append) with markdown-lite markers.
  const applyFormat = (marker: "**" | "_") => {
    const el = inputRef.current;
    setFormatOpen(false);
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const selected = text.slice(start, end) || "text";
    const next =
      text.slice(0, start) + marker + selected + marker + text.slice(end);
    setText(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    setEmojiOpen(false);
    const start = el?.selectionStart ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(start);
    setText(next);
    setTimeout(() => el?.focus(), 0);
  };

  const toggleStar = async (m: Message) => {
    const isSaved = saved.has(m.id);
    setSaved((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
    const res = await toggleSaveMessage(m.id, conversationId, !isSaved).catch(
      () => ({ ok: false })
    );
    if (!res.ok) {
      setSaved((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(m.id);
        else next.delete(m.id);
        return next;
      });
    }
  };

  const reopen = async () => {
    const res = await reopenConversation(conversationId).catch(() => ({
      ok: false,
    }));
    if (res.ok) router.refresh();
  };

  // Index of the last own message that's been read — used to show "Seen".
  const lastReadOwnIdx = (() => {
    let idx = -1;
    messages.forEach((m, i) => {
      if (m.sender_id === userId && m.read) idx = i;
    });
    return idx;
  })();

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            No messages yet. Say hello 👋
          </p>
        )}
        {messages.map((message, i) => {
          const isOwn = message.sender_id === userId;
          const highlight =
            highlightId === message.id
              ? "ring-2 ring-primary rounded-2xl"
              : "";

          // System notices — centered, visually distinct from bubbles.
          if (message.kind === "system") {
            return (
              <div key={message.id} id={`msg-${message.id}`} className={highlight}>
                <SystemChatMessage content={message.content} />
              </div>
            );
          }

          // Offer cards — persist forever; status flips in place.
          if (message.kind === "offer" && message.offer_id) {
            const offer = offersById[message.offer_id];
            if (offer) {
              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} ${highlight}`}
                >
                  <ChatOfferCard
                    offer={offer}
                    statusContent={message.content}
                    viewerIsFreelancer={offer.viewerIsFreelancer}
                  />
                </div>
              );
            }
          }

          // Proposal intro — the freelancer's cover letter opens the chat,
          // with a "View details" card linking to the proposal.
          if (message.kind === "proposal_intro") {
            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] flex flex-col ${
                    isOwn ? "items-end" : "items-start"
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1 px-1">
                    {isOwn ? myName : otherName}
                  </p>
                  <div
                    className={`rounded-2xl px-4 py-3 ${highlight} ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {renderRich(message.content)}
                    </p>
                  </div>
                  {proposalDetailsHref && (
                    <a
                      href={proposalDetailsHref}
                      className="mt-2 w-full rounded-xl bg-secondary/60 border-l-4 border-primary px-4 py-3 block hover:bg-secondary"
                    >
                      <span className="text-primary font-semibold text-sm">
                        View details
                      </span>
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          }

          // Contract proposals (freelancer → client) — same in-place pattern.
          if (message.kind === "contract_request" && message.request_id) {
            const request = requestsById[message.request_id];
            if (request) {
              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} ${highlight}`}
                >
                  <ContractRequestCard
                    request={request}
                    statusContent={message.content}
                    viewerIsClient={request.viewerIsClient}
                  />
                </div>
              );
            }
          }

          return (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              className={`group flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] flex flex-col ${
                  isOwn ? "items-end" : "items-start"
                }`}
              >
                <p className="text-xs text-muted-foreground mb-1 px-1">
                  {isOwn ? myName : otherName}
                </p>
                <div className={`flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${highlight} ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.attachment_url ? (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline break-all"
                      >
                        <span aria-hidden>📎</span>
                        {message.attachment_name || "Attachment"}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {renderRich(message.content)}
                      </p>
                    )}
                  </div>
                  {/* Save star (hover) */}
                  <button
                    type="button"
                    onClick={() => toggleStar(message)}
                    title={saved.has(message.id) ? "Unsave message" : "Save message"}
                    className={`text-sm transition ${
                      saved.has(message.id)
                        ? "text-amber-500"
                        : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {saved.has(message.id) ? "⭐" : "☆"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  {new Date(message.created_at).toLocaleString()}
                  {isOwn && i === lastReadOwnIdx && (
                    <span className="ml-1.5 text-primary">· Seen</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Moderation notice */}
      {notice && (
        <div
          className={`px-6 py-2.5 text-sm shrink-0 border-t flex items-start gap-2 ${
            notice.kind === "suspended"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          <span aria-hidden>⚠</span>
          <span>{notice.text}</span>
        </div>
      )}

      {/* Input / ended / blocked state */}
      <div className="bg-card border-t border-border px-6 py-4 shrink-0">
        {otherTyping && !ended && (
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <span className="animate-pulse">●</span> typing…
          </p>
        )}
        {ended ? (
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              🔒 This conversation has ended. Messages can no longer be sent.
            </span>
            {endedByMe && (
              <button
                type="button"
                onClick={reopen}
                className="text-primary font-semibold hover:underline shrink-0"
              >
                Reopen conversation
              </button>
            )}
          </div>
        ) : blockedByMe ? (
          <p className="text-sm text-muted-foreground">
            ⛔ You blocked {otherName}. Unblock them from the ⋯ menu above to
            resume messaging.
          </p>
        ) : blockedMe ? (
          <p className="text-sm text-muted-foreground">
            Messaging is unavailable in this conversation.
          </p>
        ) : (
          <form onSubmit={send} className="flex items-end gap-2 relative">
            {/* Formatting */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFormatOpen((f) => !f);
                  setEmojiOpen(false);
                }}
                disabled={blocked}
                aria-label="Text formatting"
                title="Text formatting"
                className="shrink-0 w-10 h-10 rounded-lg border border-border text-foreground hover:bg-secondary disabled:opacity-50 flex items-center justify-center text-sm font-semibold"
              >
                Aa
              </button>
              {formatOpen && (
                <div className="absolute bottom-12 left-0 z-30 bg-card border border-border rounded-xl shadow-lg p-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => applyFormat("**")}
                    className="w-9 h-9 rounded-lg hover:bg-secondary font-bold text-foreground"
                    title="Bold (**text**)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("_")}
                    className="w-9 h-9 rounded-lg hover:bg-secondary italic text-foreground"
                    title="Italic (_text_)"
                  >
                    I
                  </button>
                </div>
              )}
            </div>

            {/* Attach */}
            <input
              ref={fileRef}
              type="file"
              onChange={onPickFile}
              disabled={blocked || uploading}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={blocked || uploading}
              aria-label="Attach a file"
              title="Attach a file"
              className="shrink-0 w-10 h-10 rounded-lg border border-border text-foreground hover:bg-secondary disabled:opacity-50 flex items-center justify-center"
            >
              {uploading ? "…" : "📎"}
            </button>

            {/* Emoji */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setEmojiOpen((o) => !o);
                  setFormatOpen(false);
                }}
                disabled={blocked}
                aria-label="Insert emoji"
                title="Insert emoji"
                className="shrink-0 w-10 h-10 rounded-lg border border-border text-foreground hover:bg-secondary disabled:opacity-50 flex items-center justify-center"
              >
                😊
              </button>
              {emojiOpen && (
                <div className="absolute bottom-12 left-0 z-30 bg-card border border-border rounded-xl shadow-lg p-2 grid grid-cols-8 gap-1 w-72">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="w-8 h-8 rounded hover:bg-secondary text-lg"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!blocked && !ended) sendTyping();
              }}
              onKeyDown={onKeyDown}
              disabled={blocked}
              rows={1}
              placeholder={blocked ? "Messaging disabled" : "Send a message..."}
              className="flex-1 resize-none bg-background border border-border text-foreground rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={sending || blocked || !text.trim()}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </>
  );
}
