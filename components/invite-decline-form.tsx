"use client";

import { useState } from "react";
import Link from "next/link";
import { declineInvite } from "@/app/invites/actions";

// Decline-invite form: reason radios (+ Other textarea, min 10 chars) and a
// "future invites from this client" choice. Confirm stays disabled until a
// valid reason is chosen.

const REASONS: { value: string; label: string }[] = [
  { value: "skills_mismatch", label: "The job doesn't match my skills" },
  { value: "budget_low", label: "The budget is too low for this job" },
  { value: "not_available", label: "I'm not available right now" },
  { value: "not_interested", label: "I'm not interested in this type of work" },
  { value: "unclear_description", label: "The job description is unclear" },
  { value: "other", label: "Other" },
];

export function InviteDeclineForm({
  inviteId,
  clientName,
}: {
  inviteId: string;
  clientName: string;
}) {
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [future, setFuture] = useState<"continue" | "block">("continue");
  const [busy, setBusy] = useState(false);

  const valid = !!reason && (reason !== "other" || custom.trim().length >= 10);

  return (
    <form
      action={declineInvite.bind(null, inviteId)}
      onSubmit={() => setBusy(true)}
      className="space-y-6"
    >
      {/* Reason */}
      <div className="space-y-2">
        {REASONS.map((r) => (
          <label
            key={r.value}
            className="flex items-center gap-3 text-sm text-foreground cursor-pointer rounded-lg border border-border px-3 py-2.5 hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="accent-[var(--primary)]"
            />
            {r.label}
          </label>
        ))}
        {reason === "other" && (
          <div>
            <textarea
              name="custom"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
              placeholder="Tell us a bit more (at least 10 characters)…"
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm mt-1"
            />
            {custom.trim().length > 0 && custom.trim().length < 10 && (
              <p className="text-xs text-muted-foreground mt-1">
                {10 - custom.trim().length} more character
                {10 - custom.trim().length === 1 ? "" : "s"} needed.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Future invites from this client */}
      <div>
        <h2 className="font-semibold text-foreground mb-2">
          Future invites from {clientName}
        </h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer rounded-lg border border-border px-3 py-2.5 hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="future"
              value="continue"
              checked={future === "continue"}
              onChange={() => setFuture("continue")}
              className="accent-[var(--primary)]"
            />
            Continue receiving invites from this client
          </label>
          <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer rounded-lg border border-border px-3 py-2.5 hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="future"
              value="block"
              checked={future === "block"}
              onChange={() => setFuture("block")}
              className="accent-[var(--primary)] mt-0.5"
            />
            <span>
              Block invites from this client
              <span className="block text-xs text-muted-foreground mt-0.5">
                You won&apos;t receive future invites from this client. You can
                unblock them in Settings.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button
          type="submit"
          disabled={!valid || busy}
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Declining…" : "Confirm Decline"}
        </button>
        <Link
          href={`/invites/${inviteId}`}
          className="text-foreground font-medium hover:underline text-sm"
        >
          Go Back
        </Link>
      </div>
    </form>
  );
}
