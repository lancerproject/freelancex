"use client";

import { useState } from "react";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { saveConversationNote } from "@/app/(dashboard)/messages/inbox-actions";

// The right-hand detail panel in a conversation — Upwork-style collapsible
// sections: activity timeline, search messages, client profile, files & links,
// plus the freelancer's "Propose contract" flow.

export type PanelTimeline = {
  proposalAt: string | null;
  offerAt: string | null;
  offerAcceptedAt: string | null;
  contractStartsAt: string | null;
  // Pending offer awaiting the freelancer's response → green "View offer".
  pendingOfferId?: string | null;
};

export type PanelClientFacts = {
  country: string | null;
  memberSince: string | null;
  paymentVerified: boolean;
  spent: number;
  jobsPosted: number;
  hireRate: number;
  openJobs: number;
} | null;

export type PanelFile = { id: string; name: string; url: string; at: string };
export type PanelLink = { url: string; at: string };
export type PanelSearchMessage = {
  id: string;
  content: string;
  at: string;
  fromMe: boolean;
};

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ChatSidePanel({
  conversationId,
  other,
  viewerIsFreelancer,
  proposalId,
  jobId,
  jobTitle,
  contractId,
  timeline,
  clientFacts,
  files,
  links,
  searchable,
  ended,
  myNote,
}: {
  conversationId: string;
  other: {
    id: string;
    name: string;
    avatar: string | null;
    online: boolean;
    away: boolean;
    timezone?: string | null;
    bio?: string | null;
  };
  viewerIsFreelancer: boolean;
  proposalId: string | null;
  jobId: string | null;
  jobTitle: string | null;
  contractId: string | null;
  timeline: PanelTimeline | null;
  clientFacts: PanelClientFacts;
  files: PanelFile[];
  links: PanelLink[];
  searchable: PanelSearchMessage[];
  ended: boolean;
  myNote?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState(myNote ?? "");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = q
    ? searchable.filter((m) => m.content.toLowerCase().includes(q)).slice(0, 20)
    : [];

  // The client can send a formal offer from chat (once, before an offer/contract
  // exists). Uses the freelancer + job; includes the proposal if we have it.
  const offerHref =
    jobId && !viewerIsFreelancer
      ? `/offer/new?job=${jobId}&freelancer=${other.id}${
          proposalId ? `&proposal=${proposalId}` : ""
        }`
      : null;
  const canSendOffer =
    !!offerHref && !ended && !contractId && !timeline?.offerAt;

  const steps = timeline
    ? [
        {
          label: "Proposal submitted",
          at: timeline.proposalAt,
          done: !!timeline.proposalAt,
          pendingText: "",
        },
        {
          label: "Contract offer",
          at: timeline.offerAt,
          done: !!timeline.offerAt,
          pendingText: viewerIsFreelancer
            ? "Awaiting offer from the client"
            : "Send an offer to hire this freelancer",
        },
        {
          label: "Offer acceptance",
          at: timeline.offerAcceptedAt,
          done: !!timeline.offerAcceptedAt,
          pendingText:
            timeline.pendingOfferId && viewerIsFreelancer
              ? "You need to review and accept the offer"
              : "",
        },
        {
          label: "Contract starts",
          at: timeline.contractStartsAt,
          done: !!timeline.contractStartsAt,
          pendingText: "",
        },
      ]
    : [];

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col items-center text-center pb-2">
        <div className="relative">
          {other.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={other.avatar}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold">
              {(other.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-card ${
              other.away
                ? "bg-amber-400"
                : other.online
                  ? "bg-green-500"
                  : "bg-neutral-300"
            }`}
            title={other.away ? "Away" : other.online ? "Online" : "Offline"}
          />
        </div>
        <p className="font-bold text-foreground mt-2">{other.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          🕐 <LocalTime timezone={other.timezone ?? undefined} /> local time
        </p>
        {viewerIsFreelancer && proposalId && (
          <Link
            href={`/proposals/${proposalId}`}
            className="text-primary text-sm font-medium hover:underline mt-2"
          >
            👁 View proposal
          </Link>
        )}
      </div>

      {/* Activity timeline */}
      {timeline && (
        <Section title="Activity timeline" defaultOpen>
          <ol className="relative ml-2 space-y-4">
            {steps.map((s, i) => (
              <li key={s.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      s.done
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {s.done ? "✓" : i === steps.findIndex((x) => !x.done) ? "⏳" : "○"}
                  </span>
                  {i < steps.length - 1 && (
                    <span className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-1">
                  <p
                    className={`text-sm ${
                      s.done
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.done ? fmt(s.at) : s.pendingText}
                  </p>
                  {s.label === "Offer acceptance" &&
                    !s.done &&
                    viewerIsFreelancer &&
                    timeline?.pendingOfferId && (
                      <Link
                        href={`/freelancer/offers/${timeline.pendingOfferId}`}
                        className="inline-block mt-1.5 bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold hover:opacity-90"
                      >
                        View offer
                      </Link>
                    )}
                  {s.label === "Contract offer" && !s.done && canSendOffer && (
                    <Link
                      href={offerHref!}
                      className="inline-block mt-1.5 bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold hover:opacity-90"
                    >
                      Send offer
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Search messages */}
      <Section title="Search messages">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this conversation…"
          className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
        />
        {q && (
          <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matches.</p>
            ) : (
              matches.map((m) => (
                <a
                  key={m.id}
                  href={`#msg-${m.id}`}
                  onClick={() => {
                    document
                      .getElementById(`msg-${m.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="block rounded-lg px-2 py-1.5 hover:bg-secondary"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {m.fromMe ? "You" : other.name} · {fmt(m.at)}
                  </p>
                  <p className="text-xs text-foreground line-clamp-2">
                    {m.content}
                  </p>
                </a>
              ))
            )}
          </div>
        )}
      </Section>

      {/* Client profile (freelancer view) */}
      {viewerIsFreelancer && clientFacts && (
        <Section title="Client profile">
          <ul className="text-sm space-y-1.5">
            {clientFacts.country && (
              <li className="text-foreground">📍 {clientFacts.country}</li>
            )}
            {clientFacts.memberSince && (
              <li className="text-muted-foreground">
                Member since {clientFacts.memberSince}
              </li>
            )}
            <li
              className={
                clientFacts.paymentVerified
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            >
              {clientFacts.paymentVerified
                ? "✅ Payment verified"
                : "○ Payment not verified"}
            </li>
            <li className="text-muted-foreground">
              ${clientFacts.spent.toLocaleString()} spent ·{" "}
              {clientFacts.jobsPosted} job
              {clientFacts.jobsPosted === 1 ? "" : "s"} posted
            </li>
            <li className="text-muted-foreground">
              {clientFacts.hireRate}% hire rate · {clientFacts.openJobs} open
              job{clientFacts.openJobs === 1 ? "" : "s"}
            </li>
          </ul>
          <Link
            href={`/profile/${other.id}`}
            className="inline-block text-primary text-sm font-medium hover:underline mt-2"
          >
            View full profile
          </Link>
        </Section>
      )}

      {/* Files and links */}
      <Section title="Files and links">
        {files.length === 0 && links.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Files and links shared in this chat will appear here.
          </p>
        ) : (
          <div className="space-y-1.5">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
              >
                <span aria-hidden>📎</span>
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {fmt(f.at)}
                </span>
              </a>
            ))}
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
              >
                <span aria-hidden>🔗</span>
                <span className="truncate flex-1">{l.url}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {fmt(l.at)}
                </span>
              </a>
            ))}
          </div>
        )}
      </Section>

      {/* Personal notepad — private to the viewer */}
      <Section title="Personal notepad">
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteSaved(false);
          }}
          rows={4}
          placeholder="Jot down private notes about this conversation…"
          className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-muted-foreground">
            Only you can see this.
          </p>
          <button
            type="button"
            disabled={noteBusy}
            onClick={async () => {
              setNoteBusy(true);
              const res = await saveConversationNote(conversationId, note).catch(
                () => ({ ok: false })
              );
              setNoteBusy(false);
              setNoteSaved(res.ok);
            }}
            className="text-primary text-sm font-semibold hover:underline disabled:opacity-50"
          >
            {noteBusy ? "Saving…" : noteSaved ? "Saved ✓" : "Save note"}
          </button>
        </div>
      </Section>

      {/* Job / contract quick links */}
      {(jobId || contractId) && (
        <Section title={contractId ? "Contract" : "Job"}>
          {jobTitle && (
            <p className="text-sm text-muted-foreground mb-2">{jobTitle}</p>
          )}
          <div className="space-y-2">
            {jobId && (
              <Link
                href={`/jobs/${jobId}`}
                className="block text-center border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                📋 View job posting
              </Link>
            )}
            {contractId && (
              <Link
                href={`/contracts/${contractId}`}
                className="block text-center border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                📄 View contract
              </Link>
            )}
          </div>
        </Section>
      )}

      {/* Propose contract (freelancer) — opens the full propose page */}
      {viewerIsFreelancer && !ended && (
        <Link
          href={`/propose/${conversationId}`}
          className="block w-full text-center bg-primary text-primary-foreground rounded-full px-4 py-2.5 text-sm font-semibold hover:opacity-90"
        >
          📝 Propose a contract
        </Link>
      )}

      {/* Send offer (client) */}
      {canSendOffer && (
        <Link
          href={offerHref!}
          className="block w-full text-center bg-primary text-primary-foreground rounded-full px-4 py-2.5 text-sm font-semibold hover:opacity-90"
        >
          📝 Send offer to hire
        </Link>
      )}

    </div>
  );
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-border bg-card overflow-hidden group"
    >
      <summary className="px-3 py-2.5 cursor-pointer flex items-center justify-between list-none text-sm font-semibold text-foreground">
        {title}
        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-xs">
          ⌄
        </span>
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}
