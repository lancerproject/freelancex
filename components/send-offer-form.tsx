"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sendOffer } from "@/app/offers/actions";

// Client's "Send an offer" form — mirrors Upwork's offer page: Job details +
// Contract terms (payment protection, amount, payment schedule, due date, FAQ)
// and the Terms agreement. A one-time "Stay safe" notice shows before the form.

type MilestoneRow = { name: string; amount: string; due_date: string };

const SAFETY_KEY = "xwork_offer_safety_ack";

export function SendOfferForm({
  freelancerId,
  freelancerName,
  jobId,
  jobTitle,
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
  jobTitle?: string;
  proposalId?: string;
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
  const [schedule, setSchedule] = useState<"whole" | "milestones">(
    defaultMilestones && defaultMilestones.length > 0 ? "milestones" : "whole"
  );
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  // One-time "Stay safe" acknowledgement before the offer form.
  const [safetyOk, setSafetyOk] = useState(true);
  const [safetyChecked, setSafetyChecked] = useState(false);
  useEffect(() => {
    setSafetyOk(
      typeof window !== "undefined" && !!localStorage.getItem(SAFETY_KEY)
    );
  }, []);

  const cleanMilestones =
    schedule === "milestones"
      ? milestones.filter((m) => m.name.trim() && Number(m.amount) > 0)
      : [];
  const valid =
    title.trim().length > 0 &&
    Number(amount) > 0 &&
    description.trim().length > 0 &&
    agreed;

  const input =
    "w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const label = "block text-sm font-semibold text-foreground mb-1";

  if (!safetyOk) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <div className="text-4xl">🛡️</div>
        <h2 className="text-xl font-bold text-foreground mt-3">
          Stay safe on Xwork
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Keep your money protected — always keep payments and communication on
          Xwork:
        </p>
        <ul className="text-sm text-foreground mt-3 space-y-2 list-disc pl-5">
          <li>Only pay through Xwork — never send money off-platform.</li>
          <li>
            Fund milestones into escrow; the freelancer is paid only when you
            approve the work.
          </li>
          <li>
            Never share card, bank or personal contact details in chat. Paying
            outside Xwork isn&apos;t protected.
          </li>
        </ul>
        <label className="flex items-start gap-2 mt-5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={safetyChecked}
            onChange={(e) => setSafetyChecked(e.target.checked)}
            className="mt-1 accent-primary"
          />
          <span>
            I understand and will keep all payments and communication on Xwork.
          </span>
        </label>
        <button
          type="button"
          disabled={!safetyChecked}
          onClick={() => {
            localStorage.setItem(SAFETY_KEY, "1");
            setSafetyOk(true);
          }}
          className="mt-5 bg-primary text-primary-foreground rounded-full px-8 py-2.5 font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <form action={sendOffer} onSubmit={() => setBusy(true)} className="space-y-8">
      <input type="hidden" name="freelancer_id" value={freelancerId} />
      {jobId && <input type="hidden" name="job_id" value={jobId} />}
      {proposalId && (
        <input type="hidden" name="proposal_id" value={proposalId} />
      )}
      {requestId && <input type="hidden" name="request_id" value={requestId} />}
      <input type="hidden" name="rate_type" value="fixed" />
      <input
        type="hidden"
        name="milestones"
        value={JSON.stringify(cleanMilestones)}
      />

      {/* ---------------- Job details ---------------- */}
      <section className="rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-5">
        <h2 className="text-xl font-bold text-foreground">Job details</h2>

        {jobId && (
          <div>
            <p className={label}>Related job listing</p>
            <Link
              href={`/jobs/${jobId}`}
              className="text-primary hover:underline text-sm"
            >
              {jobTitle || "View job posting"}
            </Link>
          </div>
        )}

        <div>
          <label className={label}>Contract title</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={input}
            placeholder="e.g. Build my e-commerce mobile app"
          />
        </div>

        <div>
          <label className={label}>Work description</label>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 50000))}
            rows={6}
            required
            className={input}
            placeholder={`Describe the work, scope and deliverables for ${freelancerName}…`}
          />
          <p className="text-right text-xs text-muted-foreground mt-1">
            {description.length}/50,000
          </p>
        </div>

        <div>
          <label className={label}>Contract duration (optional)</label>
          <input
            name="duration"
            defaultValue={defaultDuration ?? ""}
            className={input}
            placeholder="e.g. 3 months, Long term"
          />
        </div>
      </section>

      {/* ---------------- Contract terms ---------------- */}
      <section className="rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Contract terms</h2>
          <p className="text-sm text-muted-foreground mt-1">
            🛡️ <span className="font-medium text-foreground">Xwork Payment
            Protection.</span>{" "}
            Only pay for the work you approve.
          </p>
        </div>

        <div>
          <p className={label}>Payment option</p>
          <p className="text-foreground text-sm">Fixed-price</p>
        </div>

        <div>
          <label className={label}>Contract amount (USD)</label>
          <input
            name="amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={`${input} max-w-xs`}
            placeholder="500"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This is the price you and {freelancerName} agreed on. The Xwork
            service fee is added when you fund the work.
          </p>
        </div>

        {/* Payment schedule */}
        <div>
          <p className={label}>Payment schedule</p>
          <p className="text-xs text-muted-foreground mb-3">
            Funds are held safely in escrow until you approve the work.
          </p>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="schedule"
              checked={schedule === "whole"}
              onChange={() => setSchedule("whole")}
              className="mt-1 accent-primary"
            />
            <span>
              <span className="font-medium text-foreground">
                Pay for the whole contract
              </span>
              <span className="block text-muted-foreground">
                Fund the full{amount ? ` $${amount}` : ""} amount as one
                milestone.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer mt-3">
            <input
              type="radio"
              name="schedule"
              checked={schedule === "milestones"}
              onChange={() => setSchedule("milestones")}
              className="mt-1 accent-primary"
            />
            <span>
              <span className="font-medium text-foreground">
                Pay in installments with milestones
              </span>
              <span className="block text-muted-foreground">
                Fund one milestone at a time as the work progresses.
              </span>
            </span>
          </label>

          {schedule === "milestones" && (
            <div className="mt-4 space-y-2">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_110px_150px_32px] gap-2"
                >
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
              <button
                type="button"
                onClick={() =>
                  setMilestones((m) => [
                    ...m,
                    { name: "", amount: "", due_date: "" },
                  ])
                }
                className="text-sm text-primary hover:underline font-medium"
              >
                + Add milestone
              </button>
            </div>
          )}
        </div>

        {/* Due date */}
        <div>
          <label className={label}>Due date (optional)</label>
          <input name="deadline" type="date" className={`${input} max-w-xs`} />
        </div>

        {/* FAQ */}
        <div className="rounded-xl border border-border divide-y divide-border">
          <details className="group">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between text-sm font-medium text-foreground list-none">
              How do fixed-price contracts work?
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                ⌄
              </span>
            </summary>
            <p className="px-4 pb-3 text-sm text-muted-foreground">
              You fund a milestone into escrow before work starts. The
              freelancer delivers, you review, and the funds are released only
              when you approve. If something goes wrong, you can request changes
              or open a dispute.
            </p>
          </details>
          <details className="group">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between text-sm font-medium text-foreground list-none">
              What fees will I pay?
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                ⌄
              </span>
            </summary>
            <p className="px-4 pb-3 text-sm text-muted-foreground">
              A small Xwork service fee is added when you fund the work. There
              is no cost to send an offer, and nothing is charged until you fund
              a milestone.
            </p>
          </details>
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-primary"
          />
          <span>
            Yes, I understand and agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Xwork Terms of Service
            </Link>
            , including the{" "}
            <Link href="/user-agreement" className="text-primary hover:underline">
              User Agreement
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Link
          href={jobId ? `/jobs/${jobId}?tab=proposals` : "/offers"}
          className="text-foreground font-medium hover:underline"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!valid || busy}
          className="bg-primary text-primary-foreground rounded-full px-10 py-3 font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Sending…" : "Continue"}
        </button>
      </div>
    </form>
  );
}
