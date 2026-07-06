"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { declineContractRequest } from "@/app/(dashboard)/messages/inbox-actions";

// The freelancer→client "contract proposal" card shown in chat. The message
// row's content mirrors the request status (pending / offer_sent / declined),
// so realtime UPDATEs flip the card in place — it never disappears.

export type ChatContractRequest = {
  id: string;
  title: string;
  amount: number;
  rateType: "fixed" | "hourly";
  duration: string | null;
  freelancerName: string;
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Proposed", cls: "bg-yellow-500/10 text-yellow-600" },
  offer_sent: { label: "Offer sent", cls: "bg-green-500/10 text-green-600" },
  declined: { label: "Declined", cls: "bg-red-500/10 text-red-600" },
};

export function ContractRequestCard({
  request,
  statusContent,
  viewerIsClient,
}: {
  request: ChatContractRequest;
  statusContent: string; // message.content = live status
  viewerIsClient: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const status = STATUS_PILL[statusContent] ? statusContent : "pending";
  const pill = STATUS_PILL[status];

  const decline = async () => {
    if (busy) return;
    setBusy(true);
    await declineContractRequest(request.id).catch(() => ({ ok: false }));
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="max-w-sm w-full rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground text-sm">
          📝 Contract proposal
        </p>
        <span
          className={`text-[11px] rounded-full px-2 py-0.5 font-semibold ${pill.cls}`}
        >
          {pill.label}
        </span>
      </div>
      <div className="border-t border-border mt-2 pt-2 space-y-1 text-sm">
        <p className="font-medium text-foreground">{request.title}</p>
        <p className="text-muted-foreground">
          ${request.amount}
          {request.rateType === "hourly" ? "/hr · Hourly" : " · Fixed price"}
          {request.duration ? ` · ${request.duration}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Proposed by {request.freelancerName}
        </p>
      </div>

      {viewerIsClient && status === "pending" && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
          <Link
            href={`/offer/new?request=${request.id}`}
            className="flex-1 text-center bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold hover:opacity-90"
          >
            Review &amp; send offer
          </Link>
          <button
            type="button"
            onClick={decline}
            disabled={busy}
            className="flex-1 border border-border text-foreground rounded-full px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            {busy ? "…" : "Decline"}
          </button>
        </div>
      )}
      {!viewerIsClient && status === "pending" && (
        <p className="text-xs text-muted-foreground mt-2">
          Waiting for the client to respond. If they accept, they&apos;ll send
          you an offer to review.
        </p>
      )}
      {status === "offer_sent" && (
        <p className="text-xs text-green-600 mt-2">
          ✅ The client responded with an offer — check the offer card in this
          chat.
        </p>
      )}
    </div>
  );
}
