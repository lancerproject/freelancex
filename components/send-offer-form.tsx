"use client";

import { useState } from "react";
import { sendOffer } from "@/app/offers/actions";

// Client's "Send offer" form — pre-filled from the proposal when available.
// Milestones are optional; rows with a name and amount are included.

type MilestoneRow = { name: string; amount: string; due_date: string };

export function SendOfferForm({
  freelancerId,
  freelancerName,
  jobId,
  proposalId,
  requestId,
  defaultTitle,
  defaultAmount,
  defaultDuration,
  defaultDescription,
  defaultMilestones,
}: {
  freelancerId: string;
  freelancerName: string;
  jobId?: string;
  proposalId?: string;
  // Set when the offer answers a freelancer's contract proposal — sending the
  // offer marks that request as "offer sent" and flips its chat card.
  requestId?: string;
  defaultTitle?: string;
  defaultAmount?: number;
  defaultRateType?: "fixed" | "hourly";
  defaultDuration?: string;
  defaultDescription?: string;
  defaultMilestones?: MilestoneRow[];
}) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [amount, setAmount] = useState(
    defaultAmount ? String(defaultAmount) : ""
  );
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [milestones, setMilestones] = useState<MilestoneRow[]>(
    defaultMilestones ?? []
  );
  const [busy, setBusy] = useState(false);

  const cleanMilestones = milestones.filter(
    (m) => m.name.trim() && Number(m.amount) > 0
  );
  const valid =
    title.trim().length > 0 &&
    Number(amount) > 0 &&
    description.trim().length > 0;

  const input =
    "w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm";
  const label = "block text-sm font-medium text-foreground mb-1";

  return (
    <form
      action={sendOffer}
      onSubmit={() => setBusy(true)}
      className="space-y-5"
    >
      <input type="hidden" name="freelancer_id" value={freelancerId} />
      {jobId && <input type="hidden" name="job_id" value={jobId} />}
      {proposalId && (
        <input type="hidden" name="proposal_id" value={proposalId} />
      )}
      {requestId && <input type="hidden" name="request_id" value={requestId} />}
      <input
        type="hidden"
        name="milestones"
        value={JSON.stringify(cleanMilestones)}
      />

      <div>
        <label className={label}>Offer title</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={input}
          placeholder="e.g. Build my e-commerce mobile app"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={label}>Rate (USD)</label>
          <input
            name="amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={input}
            placeholder="500"
          />
        </div>
        {/* Xwork contracts are fixed-price with milestones — no hourly work. */}
        <input type="hidden" name="rate_type" value="fixed" />
        <div>
          <label className={label}>Project deadline (optional)</label>
          <input name="deadline" type="date" className={input} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Contract duration (optional)</label>
          <input
            name="duration"
            defaultValue={defaultDuration ?? ""}
            className={input}
            placeholder="e.g. 3 months, Long term"
          />
        </div>
        <div>
          <label className={label}>Offer expires (optional)</label>
          <input name="expires_at" type="datetime-local" className={input} />
        </div>
      </div>

      <div>
        <label className={label}>About this offer</label>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          required
          className={input}
          placeholder={`Describe the work, expectations and deliverables for ${freelancerName}…`}
        />
      </div>

      {/* Milestones (optional) */}
      <div>
        <div className="flex items-center justify-between">
          <label className={label}>Milestones (optional)</label>
          <button
            type="button"
            onClick={() =>
              setMilestones((m) => [...m, { name: "", amount: "", due_date: "" }])
            }
            className="text-sm text-primary hover:underline font-medium"
          >
            + Add milestone
          </button>
        </div>
        {milestones.length > 0 && (
          <div className="space-y-2 mt-2">
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_150px_32px] gap-2">
                <input
                  value={m.name}
                  onChange={(e) =>
                    setMilestones((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, name: e.target.value } : r
                      )
                    )
                  }
                  className={input}
                  placeholder="Milestone name"
                />
                <input
                  type="number"
                  min="1"
                  value={m.amount}
                  onChange={(e) =>
                    setMilestones((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, amount: e.target.value } : r
                      )
                    )
                  }
                  className={input}
                  placeholder="$"
                />
                <input
                  type="date"
                  value={m.due_date}
                  onChange={(e) =>
                    setMilestones((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, due_date: e.target.value } : r
                      )
                    )
                  }
                  className={input}
                />
                <button
                  type="button"
                  aria-label="Remove milestone"
                  onClick={() =>
                    setMilestones((rows) => rows.filter((_, j) => j !== i))
                  }
                  className="text-muted-foreground hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!valid || busy}
        className="bg-primary text-primary-foreground rounded-full px-8 py-3 font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? "Sending offer…" : `Send Offer to ${freelancerName}`}
      </button>
    </form>
  );
}
