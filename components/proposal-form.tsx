"use client";

import { useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { submitProposal } from "@/app/(dashboard)/jobs/[id]/proposal/actions";
import { DURATIONS } from "@/lib/categories";
import { feeRate } from "@/lib/fees";

type Milestone = { description: string; due_date: string; amount: string };
type Attachment = { url: string; name: string };

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export function ProposalForm({
  jobId,
  budget,
  inviteId,
  plan = "basic",
  screeningQuestions = [],
}: {
  jobId: string;
  budget?: number;
  // When applying via a client invite — completes the invite flow on submit.
  inviteId?: string;
  // The viewer's plan drives the marketplace fee shown (Pro 5%, Basic 10%).
  plan?: string;
  // The client's screening questions the freelancer must answer.
  screeningQuestions?: string[];
}) {
  const supabase = getBrowserSupabase();

  const [answers, setAnswers] = useState<string[]>(
    () => screeningQuestions.map(() => "")
  );

  // "3 things you need to know" agreement gate (Upwork-style): clicking
  // "Submit proposal" opens this modal; the proposal is only submitted after
  // the freelancer ticks "Yes, I understand" and clicks Continue.
  const formRef = useRef<HTMLFormElement>(null);
  const [showAgree, setShowAgree] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [payType, setPayType] = useState<"milestone" | "project">("project");
  const [bid, setBid] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: "", due_date: "", amount: "" },
  ]);
  const [duration, setDuration] = useState("");
  const [cover, setCover] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const total =
    payType === "milestone"
      ? milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
      : Number(bid) || 0;
  const fee = total * feeRate(plan);
  const receive = total - fee;

  const setMilestone = (i: number, patch: Partial<Milestone>) =>
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m))
    );
  const addMilestone = () =>
    setMilestones((prev) => [...prev, { description: "", due_date: "", amount: "" }]);
  const removeMilestone = (i: number) =>
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!list.length) return;
    if (files.length + list.length > 10) {
      setFileError("You can attach up to 10 files.");
      return;
    }
    setFileError(null);
    setUploading(true);
    for (const file of list) {
      if (file.size > 25 * 1024 * 1024) {
        setFileError("Each file must be 25 MB or smaller.");
        continue;
      }
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `proposals/${jobId}/${Date.now()}-${safe}`;
      // Private bucket — served back only via the auth-gated /api/attachment route.
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: true });
      if (error) {
        setFileError("Couldn't upload a file. Please try again.");
        continue;
      }
      setFiles((prev) => [
        ...prev,
        { url: `/api/attachment/${path}`, name: file.name },
      ]);
    }
    setUploading(false);
  };

  const cleanMilestones = milestones.filter(
    (m) => m.description.trim() || Number(m.amount) > 0
  );
  const allAnswered = screeningQuestions.every(
    (_, i) => (answers[i] || "").trim().length > 0
  );
  const canSubmit =
    cover.trim().length > 0 && total > 0 && !uploading && allAnswered;

  const card =
    "rounded-2xl border border-border bg-card p-6 lg:p-8";

  return (
    <form
      ref={formRef}
      action={submitProposal.bind(null, jobId)}
      className="space-y-6"
    >
      {/* Values carried from component state */}
      <input type="hidden" name="payment_type" value={payType} />
      <input type="hidden" name="milestones" value={JSON.stringify(cleanMilestones)} />
      <input type="hidden" name="bid_amount" value={String(total)} />
      <input type="hidden" name="attachments" value={JSON.stringify(files)} />
      {inviteId && <input type="hidden" name="invite_id" value={inviteId} />}
      <input
        type="hidden"
        name="screening_answers"
        value={JSON.stringify(
          screeningQuestions.map((q, i) => ({
            question: q,
            answer: answers[i] || "",
          }))
        )}
      />

      {/* ---------------- Screening questions ---------------- */}
      {screeningQuestions.length > 0 && (
        <section className={card}>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Answer the client&apos;s questions
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The client asked these — a clear answer helps you stand out.
          </p>
          <div className="space-y-5">
            {screeningQuestions.map((q, i) => (
              <div key={i}>
                <label className="block font-medium text-foreground mb-1">
                  {i + 1}. {q}
                </label>
                <textarea
                  required
                  rows={3}
                  value={answers[i] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => {
                      const n = [...prev];
                      n[i] = e.target.value;
                      return n;
                    })
                  }
                  placeholder="Your answer"
                  className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Terms ---------------- */}
      <section className={card}>
        <h2 className="text-xl font-bold text-foreground mb-5">Terms</h2>

        <p className="font-medium text-foreground mb-3">
          How do you want to be paid?
        </p>
        <div className="space-y-3">
          {[
            {
              v: "milestone" as const,
              t: "By milestone",
              d: "Divide the project into smaller segments, called milestones. You'll be paid for milestones as they are completed and approved.",
            },
            {
              v: "project" as const,
              t: "By project",
              d: "Get your entire payment at the end, when all work has been delivered.",
            },
          ].map((o) => (
            <label key={o.v} className="flex gap-3 cursor-pointer">
              <input
                type="radio"
                name="pay"
                checked={payType === o.v}
                onChange={() => setPayType(o.v)}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block font-medium text-foreground">{o.t}</span>
                <span className="block text-sm text-muted-foreground">{o.d}</span>
              </span>
            </label>
          ))}
        </div>

        {/* Milestone mode */}
        {payType === "milestone" ? (
          <div className="mt-6">
            <p className="font-medium text-foreground mb-3">
              How many milestones do you want to include?
            </p>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_180px_140px_auto] gap-3 items-start"
                >
                  <input
                    placeholder={`Milestone ${i + 1} description`}
                    value={m.description}
                    onChange={(e) => setMilestone(i, { description: e.target.value })}
                    className="bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="date"
                    value={m.due_date}
                    onChange={(e) => setMilestone(i, { due_date: e.target.value })}
                    className="bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={m.amount}
                      onChange={(e) => setMilestone(i, { amount: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg p-2.5 pl-6 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {milestones.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      className="text-sm text-orange-400 hover:text-orange-500 hover:underline pt-2.5"
                    >
                      Remove
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMilestone}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              + Add milestone
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="font-medium text-foreground mb-2">
              What is the full amount you&apos;d like to bid for this job?
            </p>
            <label className="block text-sm text-muted-foreground mb-1">
              Bid — total amount the client will see on your proposal
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                min="1"
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                placeholder={budget ? String(budget) : "800"}
                className="w-full bg-background border border-border rounded-lg p-2.5 pl-7 text-right focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Fee breakdown */}
        <div className="mt-6 border-t border-border pt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium">
              Total amount the client will see
            </span>
            <span className="text-foreground font-semibold">{money(total)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Freelancer Service Fee (10%) — fixed for the entire contract</span>
            <span>-{money(fee)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-foreground font-medium">
              You&apos;ll receive — estimated, after service fees
            </span>
            <span className="text-foreground font-bold">{money(receive)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Includes Xwork Fixed-Price Protection — your payment is held securely
            in escrow and released as work is approved.
          </p>
        </div>
      </section>

      {/* ---------------- Duration ---------------- */}
      <section className={card}>
        <p className="font-medium text-foreground mb-2">
          How long will this project take?
        </p>
        <select
          name="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full max-w-xs bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a duration</option>
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </section>

      {/* ---------------- Additional details ---------------- */}
      <section className={card}>
        <h2 className="text-xl font-bold text-foreground mb-5">
          Additional details
        </h2>
        <label className="block font-medium text-foreground mb-1">
          Cover letter
        </label>
        <textarea
          name="cover_letter"
          required
          rows={8}
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          placeholder="Introduce yourself and explain why you're a great fit for this job."
          className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="mt-5">
          <p className="font-medium text-foreground">Attachments</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add work samples to strengthen your proposal. Please remove any
            contact details — sharing these before a contract is against our
            policy.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Up to 10 files (max 25 MB each)
          </p>

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2"
                >
                  <span className="truncate">📎 {f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-orange-400 hover:text-orange-500 hover:underline shrink-0 ml-3"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="inline-flex items-center gap-2 mt-3 border border-primary text-primary rounded-full px-5 py-2 text-sm font-semibold cursor-pointer hover:bg-primary/10">
            📎 {uploading ? "Uploading…" : "Attach files"}
            <input type="file" multiple onChange={onFiles} className="hidden" />
          </label>
          {fileError && (
            <p className="text-sm text-red-500 mt-2">{fileError}</p>
          )}
        </div>
      </section>

      {/* ---------------- Submit ---------------- */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            setAgreed(false);
            setShowAgree(true);
          }}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
        >
          Submit proposal
        </button>
        <span className="text-sm text-muted-foreground">
          Applying is <span className="text-foreground font-medium">free</span>
        </span>
      </div>

      {/* ---------------- "3 things you need to know" agreement ---------------- */}
      {showAgree && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAgree(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border p-7 lg:p-9 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAgree(false)}
              aria-label="Close"
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground text-2xl leading-none"
            >
              ✕
            </button>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground pr-8">
              3 things you need to know
            </h2>
            <p className="text-muted-foreground mt-3">
              You&apos;re submitting a proposal for a fixed-price project. While
              the majority of Xwork projects are completed successfully, please
              keep a few things in mind:
            </p>

            <ol className="mt-6 space-y-5">
              {[
                {
                  t: "Fixed-price projects have Dispute Assistance",
                  d: "Before you start, you and the client agree on the requirements, budget and milestones. The client funds the project up front, and the money for each milestone is held securely in escrow.",
                },
                {
                  t: "Funds are released when the client approves the work",
                  d: "As milestones are completed, the client can either approve the work or request changes. Clients can also ask you to approve the return of funds being held.",
                },
                {
                  t: "Xwork offers mediation services",
                  d: "If you do the work and the client refuses to pay, Xwork can help mediate the dispute.",
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-muted-foreground font-medium">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{item.t}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-sm text-foreground mt-6">
              Please note: only funds deposited for an active milestone are
              covered by Dispute Assistance.
            </p>

            <label className="flex items-center gap-3 mt-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              <span className="font-medium text-foreground">
                Yes, I understand.
              </span>
            </label>

            <div className="flex items-center justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={() => setShowAgree(false)}
                className="text-foreground font-medium px-4 py-2 hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agreed}
                onClick={() => {
                  setShowAgree(false);
                  formRef.current?.requestSubmit();
                }}
                className="bg-primary text-primary-foreground rounded-full px-8 py-2.5 font-semibold hover:opacity-90 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
