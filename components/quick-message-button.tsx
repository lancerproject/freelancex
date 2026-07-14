"use client";

import { useState } from "react";
import Link from "next/link";
import { quickMessageOnJob } from "@/app/(dashboard)/messages/actions";

// A "Message" button that opens a popup on the SAME page so a client can fire
// off a message to a freelancer and keep reviewing proposals — handy when
// messaging several applicants in a row. Reuses the moderated send path.
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
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convoId, setConvoId] = useState<string | null>(null);

  const send = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await quickMessageOnJob(jobId, freelancerId, text).catch(
      () => ({ ok: false as const, error: "Something went wrong." })
    );
    setBusy(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = res as any;
    if (r.ok) {
      setSent(true);
      setText("");
      setConvoId(r.convoId ?? null);
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
    setSent(false);
    setError(null);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div
            className="relative bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">
                Message {freelancerName}
              </h3>
              <button
                onClick={close}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {sent ? (
              <div className="text-center py-4">
                <p className="text-foreground font-medium">Message sent ✓</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Keep reviewing proposals, or open the conversation.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => setSent(false)}
                    className="border border-border rounded-full px-4 py-1.5 text-sm hover:bg-secondary"
                  >
                    Send another
                  </button>
                  {convoId && (
                    <Link
                      href={`/messages/${convoId}`}
                      className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-sm font-semibold hover:opacity-90"
                    >
                      Open conversation
                    </Link>
                  )}
                  <button
                    onClick={close}
                    className="text-sm text-muted-foreground hover:text-foreground px-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder={`Write a message to ${freelancerName}…`}
                  className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={close}
                    className="px-4 py-2 rounded-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={send}
                    disabled={busy || !text.trim()}
                    className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
