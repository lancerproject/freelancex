"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  quickMessageOnJob,
  getQuickThread,
} from "@/app/(dashboard)/messages/actions";

type Msg = {
  id: string;
  content: string;
  mine: boolean;
  system: boolean;
  created_at: string;
};

// A "Message" button that opens a mini-inbox popup on the SAME page: it loads
// the existing conversation with this freelancer (if any) so the client sees
// prior messages, and can send more — handy when messaging several applicants
// without leaving the proposals page. Reuses the moderated send path.
export function QuickMessageButton({
  jobId,
  freelancerId,
  freelancerName,
  className,
  label = "Message",
}: {
  jobId: string;
  freelancerId: string;
  freelancerName: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [convoId, setConvoId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await getQuickThread(jobId, freelancerId).catch(() => null);
    setLoading(false);
    if (res) {
      setMessages(res.messages);
      setConvoId(res.convoId);
    }
  };

  const openPopup = () => {
    setOpen(true);
    void load();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    const body = text;
    const res = await quickMessageOnJob(jobId, freelancerId, body).catch(() => ({
      ok: false as const,
      error: "Something went wrong.",
    }));
    setBusy(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = res as any;
    if (r.ok) {
      setText("");
      if (r.convoId) setConvoId(r.convoId);
      // Show it immediately, then re-sync from the server.
      setMessages((m) => [
        ...m,
        {
          id: `local-${Date.now()}`,
          content: body,
          mine: true,
          system: false,
          created_at: new Date().toISOString(),
        },
      ]);
      void load();
    } else {
      setError(
        r.blocked
          ? r.reason || "That message can't be sent."
          : r.suspended
            ? "Your account can't send messages right now."
            : r.error || "Couldn't send your message."
      );
    }
  };

  const close = () => {
    setOpen(false);
    setError(null);
    setText("");
  };

  return (
    <>
      <button type="button" onClick={openPopup} className={className}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div
            className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {freelancerName}
              </h3>
              <div className="flex items-center gap-3">
                {convoId && (
                  <Link
                    href={`/messages/${convoId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Open full chat
                  </Link>
                )}
                <button
                  onClick={close}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Thread */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[160px]"
            >
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Loading…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No messages yet — say hello to {freelancerName}.
                </p>
              ) : (
                messages.map((m) =>
                  m.system ? (
                    <p
                      key={m.id}
                      className="text-center text-xs text-muted-foreground py-1"
                    >
                      {m.content}
                    </p>
                  ) : (
                    <div
                      key={m.id}
                      className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                    >
                      <span
                        className={`inline-block rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap break-words ${
                          m.mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {m.content}
                      </span>
                    </div>
                  )
                )
              )}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-border">
              {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                  placeholder={`Write a message to ${freelancerName}…`}
                  className="flex-1 resize-none bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={send}
                  disabled={busy || !text.trim()}
                  className="bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
