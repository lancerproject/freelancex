"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";

const HOURS_OPTIONS = [
  "More than 30 hrs/week",
  "Less than 30 hrs/week",
  "As needed - open to offers",
  "None",
];

const CONTRACT_PREF = "Open to contract-to-hire roles";
const ALL_PREF = "Open to all jobs";

export function AvailabilityEditor({
  hours,
  jobPref,
  avgResponse,
}: {
  hours?: string | null;
  jobPref?: string | null;
  avgResponse?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(hours || "");
  const [contract, setContract] = useState(jobPref === CONTRACT_PREF);
  const [resp, setResp] = useState(avgResponse || "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const reset = () => {
    setH(hours || "");
    setContract(jobPref === CONTRACT_PREF);
    setResp(avgResponse || "");
  };

  const save = () => {
    const fd = new FormData();
    fd.set("hours_per_week", h);
    fd.set("job_preference", contract ? CONTRACT_PREF : ALL_PREF);
    fd.set("avg_response", resp);
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        aria-label="Edit availability"
        title="Edit availability"
        className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-lg w-full p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">Availability</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <h3 className="text-lg font-semibold text-foreground mt-6">
              Hours per week
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Knowing how much you can work helps clients find the right fit.
            </p>
            <div className="space-y-2">
              {HOURS_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-3 text-foreground cursor-pointer"
                >
                  <input
                    type="radio"
                    name="hours"
                    checked={h === opt}
                    onChange={() => setH(opt)}
                    className="w-4 h-4 accent-[var(--primary)]"
                  />
                  {opt}
                </label>
              ))}
            </div>

            <h3 className="text-lg font-semibold text-foreground mt-6">
              Contract-to-hire
            </h3>
            <label className="flex items-start gap-3 text-foreground cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={contract}
                onChange={(e) => setContract(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[var(--primary)]"
              />
              <span>
                I&apos;m open to contract-to-hire opportunities
                <span className="block text-sm text-muted-foreground">
                  You&apos;ll start with a contract and may later explore a
                  full-time option.
                </span>
              </span>
            </label>

            <h3 className="text-lg font-semibold text-foreground mt-6">
              Avg. response time
            </h3>
            <input
              value={resp}
              onChange={(e) => setResp(e.target.value)}
              placeholder="e.g. 0-4 hours"
              className="w-full mt-2 bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="flex justify-end items-center gap-4 mt-7">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
