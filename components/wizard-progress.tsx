"use client";

import { usePathname } from "next/navigation";
import { WIZARD_STEPS } from "@/lib/wizard";

// Upwork-style progress strip shown on every "create your profile" step.
// Reads the current step from the URL and maps it to its position in the
// wizard, so it needs no props and stays correct as the user moves / resumes.
const LABELS: Record<string, string> = {
  work: "What work you do",
  skills: "Skills",
  title: "Professional title",
  experience: "Work experience",
  education: "Education",
  languages: "Languages",
  overview: "Profile overview",
  rate: "Hourly rate",
  details: "Finishing details",
  preview: "Review & publish",
};

export function WizardProgress() {
  const pathname = usePathname();
  const seg = (pathname || "").split("/").filter(Boolean).pop() || "";
  const idx = (WIZARD_STEPS as readonly string[]).indexOf(seg);
  if (idx < 0) return null; // not on a numbered wizard step

  const total = WIZARD_STEPS.length;
  const current = idx + 1;
  const pct = Math.round((current / total) * 100);

  return (
    <div className="w-full border-b border-neutral-200 bg-white">
      <div className="max-w-3xl mx-auto px-6 py-2.5">
        <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-1.5">
          <span>
            Step {current} of {total} — {LABELS[seg] || seg}
          </span>
          <span>{pct}%</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-neutral-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
