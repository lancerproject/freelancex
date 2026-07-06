"use client";

import Link from "next/link";

// The job-offer card rendered inside chat for messages with kind='offer'.
// It never disappears from the history — its status pill flips in place
// (the message row's content carries the live status: pending | accepted |
// declined, so the existing realtime UPDATE subscription re-renders it).
// Actions live on the offer detail page only — this card just links there.

export type ChatOffer = {
  id: string;
  title: string;
  amount: number;
  rateType: "fixed" | "hourly";
  deadline: string | null;
  clientName: string;
  expiresAt?: string | null;
  // Upwork-style card extras.
  description?: string | null; // "About this offer" text shown above the box
  firstMilestoneName?: string | null;
  projectFunds?: number | null;
};

function statusOf(content: string, expiresAt?: string | null) {
  if (content === "accepted") return "accepted";
  if (content === "declined") return "declined";
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "expired";
  return "pending";
}

const PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-yellow-500/15 text-yellow-600" },
  accepted: { label: "✅ Accepted", cls: "bg-primary/15 text-primary" },
  declined: { label: "❌ Declined", cls: "bg-red-100 text-red-600" },
  expired: { label: "⏰ Expired", cls: "bg-secondary text-muted-foreground" },
};

export function ChatOfferCard({
  offer,
  statusContent,
  viewerIsFreelancer,
}: {
  offer: ChatOffer;
  statusContent: string; // the message row's content (live status)
  viewerIsFreelancer: boolean;
}) {
  const status = statusOf(statusContent, offer.expiresAt);
  const pill = PILL[status];
  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <div className="max-w-md w-full">
      <div className="flex items-center justify-between gap-3 mb-1 px-1">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{offer.clientName}</span>{" "}
          <span className="text-muted-foreground">sent an offer</span>
        </p>
        <span className={`text-xs rounded-full px-2.5 py-0.5 font-semibold shrink-0 ${pill.cls}`}>
          {pill.label}
        </span>
      </div>
      {offer.description && (
        <p className="text-sm text-foreground whitespace-pre-wrap mb-2 px-1">
          {offer.description}
        </p>
      )}
      <div className="rounded-xl bg-secondary/60 border-l-4 border-primary px-4 py-3 space-y-1.5 text-sm">
        <p className="text-foreground">
          Est. Budget: <span className="font-medium">${offer.amount}</span>
          {offer.rateType === "hourly" ? "/hr (Hourly)" : ""}
        </p>
        {offer.firstMilestoneName && (
          <p className="text-foreground">
            Milestone 1:{" "}
            <span className="font-medium">{offer.firstMilestoneName}</span>
          </p>
        )}
        <p className="text-foreground">
          Project funds:{" "}
          <span className="font-medium">
            ${offer.projectFunds ?? offer.amount}
          </span>
        </p>
        {fmt(offer.deadline) && (
          <p className="text-muted-foreground">Deadline: {fmt(offer.deadline)}</p>
        )}
        {viewerIsFreelancer && (
          <Link
            href={`/freelancer/offers/${offer.id}`}
            className="inline-block text-primary font-semibold hover:underline pt-1"
          >
            View details
          </Link>
        )}
      </div>
    </div>
  );
}

// Centered system notice inside chat (accepts, declines, withdrawals). Its
// look is deliberately distinct from message bubbles.
export function SystemChatMessage({ content }: { content: string }) {
  const positive = content.startsWith("✅") || content.toLowerCase().includes("accepted");
  return (
    <div className="flex justify-center my-2">
      <div
        className={`max-w-md text-center text-sm rounded-xl px-4 py-3 border ${
          positive
            ? "bg-primary/10 border-primary/30 text-foreground"
            : "bg-secondary border-border text-muted-foreground"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
