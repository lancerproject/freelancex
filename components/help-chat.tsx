"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitChatTicket } from "@/app/help/chat-actions";

// Help Center AI chat. The user asks questions; the assistant answers, and
// when they want a human or to report a problem it drafts a support ticket
// they review inline and submit — which opens it in the Support & requests
// center (where admins can reply).

type Msg = { role: "user" | "assistant"; content: string };
type Draft = { subject: string; category: string; description: string };

const CATEGORIES: { value: string; label: string }[] = [
  { value: "account", label: "Account & sign in" },
  { value: "payments", label: "Payments & withdrawals" },
  { value: "jobs", label: "Jobs & proposals" },
  { value: "contracts", label: "Contracts & milestones" },
  { value: "report", label: "Report a problem" },
  { value: "other", label: "Something else" },
];

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey, I'm Casio 👋 — your Xwork helper, here to make things easy. Ask me anything about applying to jobs, getting paid, withdrawals, fees, or verifying your account. If you'd rather talk to a real person, just say the word and I'll set up a support ticket for you.",
};

export function HelpChat() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, draft, ticketId]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setErr(null);
    setDraft(null);
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m !== GREETING),
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data.reply ||
            "Sorry, I couldn't process that. Try rephrasing, or open a support ticket.",
        },
      ]);
      if (data.ticketDraft) {
        setDraft({
          subject: data.ticketDraft.subject || "",
          category: data.ticketDraft.category || "other",
          description: data.ticketDraft.description || "",
        });
      } else if (data.offerTicket) {
        setDraft({ subject: "", category: "other", description: clean });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Something went wrong. You can open a support request and our team will help you directly.",
        },
      ]);
      setDraft({ subject: "", category: "other", description: clean });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!draft || submitting) return;
    setErr(null);
    setSubmitting(true);
    const res = await submitChatTicket(draft).catch(() => ({
      ok: false as const,
      error: "Something went wrong.",
    }));
    setSubmitting(false);
    if (res.ok && res.ticketId) {
      setTicketId(res.ticketId);
      setDraft(null);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "✅ Your support ticket has been created. Our team typically replies within 1 business day — you can follow it in your support requests.",
        },
      ]);
    } else {
      setErr(res.error || "Couldn't create the ticket.");
    }
  };

  const field =
    "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-border bg-secondary/40">
        <p className="font-semibold text-foreground">
          💬 Chat with Casio
        </p>
        <p className="text-xs text-muted-foreground">
          Your Xwork helper · replies in seconds · can open a support ticket for
          you
        </p>
      </div>

      <div ref={scrollRef} className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-secondary text-muted-foreground rounded-2xl px-3.5 py-2 text-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}

        {/* Inline ticket draft the user reviews and submits */}
        {draft && !ticketId && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Review your support ticket
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Subject
              </label>
              <input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="Short summary of your issue"
                className={field}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={field}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={4}
                placeholder="Describe what's happening"
                className={field}
              />
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit ticket"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {ticketId && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
            <Link
              href={`/support/${ticketId}`}
              className="font-semibold text-primary hover:underline"
            >
              View your support request →
            </Link>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 bg-background border border-border text-foreground rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
