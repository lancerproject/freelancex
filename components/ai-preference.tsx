"use client";

import { setAiPreference } from "@/app/settings/actions";

// AI preference card for the client "My info" page — mirrors Upwork's card:
// explains how account data may help improve the platform's AI, shows the
// current choice, and lets the client change it.
export function AiPreference({ optOut }: { optOut: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <h3 className="text-xl font-bold text-foreground">AI preference</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
        Choose how your data helps train and improve the AI features that power
        Xwork.
      </p>

      <div className="flex items-start gap-3 mt-5">
        <span
          className={`mt-0.5 shrink-0 ${optOut ? "text-destructive" : "text-primary"}`}
          aria-hidden
        >
          {optOut ? "✕" : "✓"}
        </span>
        <p className="text-foreground">
          {optOut
            ? "Your data will only be used to help keep Xwork safe and prevent fraud."
            : "Your data may be used to help train and improve Xwork's AI features."}
        </p>
      </div>

      <p className="text-xs text-muted-foreground mt-3 max-w-2xl">
        <span className="font-semibold">Note:</span> Certain data must be
        processed to train systems that protect the platform. Model training for
        fraud detection and trust &amp; safety purposes is not subject to opt-out.
      </p>

      <form action={setAiPreference} className="mt-5">
        <input type="hidden" name="opt_out" value={optOut ? "0" : "1"} />
        <button
          type="submit"
          className="border border-primary text-primary rounded-full px-5 py-2 text-sm font-semibold hover:bg-primary/10"
        >
          Change preference
        </button>
      </form>
    </div>
  );
}
