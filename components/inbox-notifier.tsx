"use client";

import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Listens for incoming messages across ALL of the user's conversations and
// plays a short tone + desktop notification (when permitted). Mounted on the
// Messages pages. The tone is synthesized with WebAudio — no audio asset.
export function InboxNotifier({
  userId,
  conversationIds,
  activeConversationId,
  namesByConversation,
}: {
  userId: string;
  conversationIds: string[];
  activeConversationId?: string;
  // conversation id → other participant's name (for the notification title)
  namesByConversation: Record<string, string>;
}) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (conversationIds.length === 0) return;
    const supabase = getBrowserSupabase();
    const idSet = new Set(conversationIds);

    const beep = () => {
      // The message tone can be turned off in the Message-settings popup.
      if (localStorage.getItem("xwork_message_sound_off") === "1") return;
      try {
        // Two quick soft notes — a friendly "message tone".
        const Ctor =
          window.AudioContext ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).webkitAudioContext;
        if (!Ctor) return;
        const ctx = (audioCtxRef.current ??= new Ctor());
        const play = (freq: number, at: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
          gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + at + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.25);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + at);
          osc.stop(ctx.currentTime + at + 0.3);
        };
        play(880, 0);
        play(1174, 0.15);
      } catch {
        /* audio blocked — fine */
      }
    };

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: { new: any }) => {
          const m = payload.new;
          if (!m || !idSet.has(m.conversation_id)) return;
          if (m.sender_id === userId) return; // own message
          if (m.kind === "system") return; // no tone for system notes

          // Skip when the user is actively looking at this exact thread.
          const looking =
            document.visibilityState === "visible" &&
            m.conversation_id === activeConversationId;
          if (looking) return;

          beep();

          if ("Notification" in window && Notification.permission === "granted") {
            const from = namesByConversation[m.conversation_id] || "New message";
            const body =
              m.kind === "offer"
                ? "🎉 Sent you a job offer"
                : m.kind === "contract_request"
                  ? "📝 Sent a contract proposal"
                  : m.kind === "attachment" || m.attachment_url
                    ? "📎 Sent an attachment"
                    : (m.content || "New message").slice(0, 80);
            try {
              const n = new Notification(`${from} — Xwork Messages`, {
                body,
                tag: `xwork-msg-${m.conversation_id}`,
              });
              n.onclick = () => {
                window.focus();
                window.location.href = `/messages/${m.conversation_id}`;
              };
            } catch {
              /* notification blocked — tone already played */
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversationIds, activeConversationId, namesByConversation]);

  return null;
}
