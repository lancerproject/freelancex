"use client";

import { useState } from "react";
import { reportJob } from "@/app/(dashboard)/jobs/report-actions";

const REASONS = [
  { value: "fraud", label: "This job is fraudulent or a scam" },
  { value: "inappropriate", label: "This job contains inappropriate content" },
  { value: "tos", label: "This job violates Xwork's Terms of Service" },
  { value: "spam", label: "This job is spam or misleading" },
  { value: "other", label: "Other" },
];

// Flag / report a job. Renders the flag control on the job detail page, opens a
// reason modal, submits, then shows a thank-you. Once reported it stays flagged.
export function ReportJobButton({
  jobId,
  alreadyReported,
}: {
  jobId: string;
  alreadyReported: boolean;
}) {
  const [reported, setReported] = useState(alreadyReported);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false); // thank-you shown
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState(false); // "already reported" inline msg

  const canSubmit =
    !!reason && (reason !== "other" || description.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setErr(null);
    setBusy(true);
    const res = await reportJob(jobId, reason, description);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setDone(true);
      setReported(true);
    } else if (res.alreadyReported) {
      setOpen(false);
      setReported(true);
      setNotice(true);
    } else {
      setErr(res.error || "Couldn't submit your report. Please try again.");
    }
  };

  return (
    <div>
      {/* Flag control */}
      <button
        type="button"
        title="Flag this job as inappropriate"
        onClick={() => (reported ? setNotice(true) : (setErr(null), setOpen(true)))}
        className={`inline-flex items-center gap-2 text-sm font-medium ${
          reported
            ? "text-orange-500"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden>{reported ? "🚩" : "⚑"}</span>
        {reported ? "Reported" : "Flag as inappropriate"}
      </button>

      {reported && notice && (
        <p className="text-xs text-muted-foreground mt-1">
          You have already reported this job.
        </p>
      )}

      {/* Reason modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto py-12 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-lg p-6 sm:p-8 my-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Flag this job posting
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Why do you want to flag this job? Select the reason that best
              applies.
            </p>

            <div className="mt-5 space-y-1">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-3 py-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r.value}
                    onChange={() => {
                      setReason(r.value);
                      setErr(null);
                    }}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-foreground text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            {reason === "other" && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue"
                rows={4}
                className="w-full mt-2 bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {err && <p className="text-sm text-red-500 mt-3">{err}</p>}

            <div className="flex justify-end items-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground font-medium hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || busy}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank-you confirmation */}
      {done && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto py-16 px-4"
          onClick={() => setDone(false)}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-md p-6 sm:p-8 my-auto shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3" aria-hidden>
              🚩
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Thanks for flagging this job
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              We take reports seriously and will review this posting to keep
              Xwork safe and trustworthy.
            </p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
