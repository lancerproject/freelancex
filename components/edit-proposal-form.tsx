"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProposal } from "@/app/proposals/actions";
import { DURATIONS } from "@/lib/categories";

// Edit a live proposal (pending / shortlisted): cover letter, duration, and
// the bid — a single amount, or the milestone list in milestone mode.

type Milestone = { description: string; amount: string; due_date: string };

export function EditProposalForm({
  proposalId,
  paymentType,
  initialCoverLetter,
  initialBid,
  initialDuration,
  initialMilestones,
}: {
  proposalId: string;
  paymentType: "project" | "milestone";
  initialCoverLetter: string;
  initialBid: number;
  initialDuration: string;
  initialMilestones: { description?: string; amount?: number; due_date?: string }[];
}) {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter);
  const [bid, setBid] = useState(String(initialBid || ""));
  const [duration, setDuration] = useState(initialDuration);
  const [milestones, setMilestones] = useState<Milestone[]>(
    initialMilestones.map((m) => ({
      description: m.description || "",
      amount: m.amount != null ? String(m.amount) : "",
      due_date: m.due_date || "",
    }))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isMilestone = paymentType === "milestone";
  const total = isMilestone
    ? milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
    : Number(bid) || 0;
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const setRow = (i: number, key: keyof Milestone, v: string) =>
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [key]: v } : m))
    );

  const save = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await updateProposal(proposalId, {
      coverLetter,
      bidAmount: Number(bid) || 0,
      duration,
      milestones: milestones.map((m) => ({
        description: m.description,
        amount: Number(m.amount) || 0,
        due_date: m.due_date || undefined,
      })),
    }).catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (res.ok) {
      router.push(`/proposals/${proposalId}?saved=1`);
    } else {
      setErr(res.error || "Couldn't save your changes.");
    }
  };

  const input =
    "w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const label = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="space-y-5">
      <div>
        <label className={label}>Cover letter</label>
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={10}
          className={input}
        />
        <p className="text-xs text-muted-foreground mt-1">
          The same rules apply as when applying — no contact details or
          off-platform payment arrangements.
        </p>
      </div>

      {isMilestone ? (
        <div>
          <label className={label}>Milestones</label>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[1fr_130px_150px_36px] gap-2"
              >
                <input
                  value={m.description}
                  onChange={(e) => setRow(i, "description", e.target.value)}
                  placeholder={`Milestone ${i + 1}`}
                  className={input}
                />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={m.amount}
                  onChange={(e) => setRow(i, "amount", e.target.value)}
                  placeholder="Amount"
                  className={input}
                />
                <input
                  type="date"
                  value={m.due_date}
                  onChange={(e) => setRow(i, "due_date", e.target.value)}
                  className={input}
                />
                <button
                  type="button"
                  aria-label="Remove milestone"
                  onClick={() =>
                    setMilestones((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-muted-foreground hover:text-orange-500 text-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setMilestones((prev) => [
                ...prev,
                { description: "", amount: "", due_date: "" },
              ])
            }
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            + Add milestone
          </button>
        </div>
      ) : (
        <div>
          <label className={label}>Your bid (USD, total for the project)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            className={input}
          />
        </div>
      )}

      <div>
        <label className={label}>How long will this project take?</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={input}
        >
          <option value="">Not sure yet</option>
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm flex justify-between">
        <span className="text-muted-foreground">Total bid</span>
        <span className="font-semibold text-foreground">{money(total)}</span>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="bg-primary text-primary-foreground rounded-full px-7 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <a
          href={`/proposals/${proposalId}`}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
