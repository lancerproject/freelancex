"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withdrawProposal } from "@/app/proposals/actions";

// Withdraw the freelancer's own proposal — opens a modal that requires a
// reason. Closes on Escape or clicking outside. The confirm button stays
// disabled until a valid reason is selected. Render this ONLY when withdrawal
// is actually allowed (not hired, job open, no pending offer) — restricted
// states hide the button entirely rather than disabling it.

const REASONS: { value: string; label: string }[] = [
  { value: "found_other", label: "I found another opportunity" },
  { value: "not_fit", label: "The job no longer fits my skills" },
  { value: "budget_low", label: "The budget does not meet my expectations" },
  { value: "made_mistake", label: "I made a mistake in my proposal" },
  { value: "client_unresponsive", label: "The client is unresponsive" },
  { value: "other", label: "Other" },
];

export function WithdrawProposalButton({
  proposalId,
  redirectTo = "/freelancer?withdrawn=1",
  small,
}: {
  proposalId: string;
  // Where to go after a successful withdrawal. Pass null to stay on the page
  // (list cards update in place via refresh).
  redirectTo?: string | null;
  small?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const valid =
    !!reason && (reason !== "other" || custom.trim().length >= 10);

  const doWithdraw = async () => {
    if (!valid || busy) return;
    setErr(null);
    setBusy(true);
    const res = await withdrawProposal(proposalId, reason, custom).catch(
      () => ({ ok: false, error: "Something went wrong. Please try again." })
    );
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } else {
      setErr(res.error || "Couldn't withdraw the proposal.");
    }
  };

  if (done && !redirectTo) {
    return (
      <p className="text-sm text-primary">
        Your proposal has been withdrawn and moved to Archived.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          small
            ? "text-sm text-red-500 hover:underline"
            : "border border-red-300 text-red-600 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-red-50"
        }
      >
        Withdraw proposal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            // Clicking the backdrop (outside the dialog) closes the modal.
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
              setOpen(false);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-foreground">
              Withdraw Your Proposal
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please tell us why you want to withdraw. This helps us improve
              your experience.
            </p>

            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-3 text-sm text-foreground cursor-pointer rounded-lg border border-border px-3 py-2.5 hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name={`withdraw-reason-${proposalId}`}
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-[var(--primary)]"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            {reason === "other" && (
              <div className="mt-3">
                <textarea
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  rows={3}
                  placeholder="Tell us a bit more (at least 10 characters)…"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                />
                {custom.trim().length > 0 && custom.trim().length < 10 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {10 - custom.trim().length} more character
                    {10 - custom.trim().length === 1 ? "" : "s"} needed.
                  </p>
                )}
              </div>
            )}

            {err && <p className="text-sm text-red-500 mt-3">{err}</p>}

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground font-medium hover:underline text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doWithdraw}
                disabled={!valid || busy}
                className="bg-red-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "Withdrawing…" : "Withdraw Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
