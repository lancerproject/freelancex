"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptOffer, declineOffer } from "@/app/offers/actions";

// Accept / Decline actions for a job offer — used by BOTH the offer detail
// page and the Offers-tab quick buttons. Accept opens a small confirmation
// modal; Decline opens the reason modal (required, Other → min 10 chars).
// Modals close on Escape and on clicking outside.

const DECLINE_REASONS: { value: string; label: string }[] = [
  { value: "rate_low", label: "The offered rate is too low" },
  { value: "accepted_other", label: "I've already accepted another offer" },
  { value: "timeline", label: "The timeline doesn't work for me" },
  { value: "scope_mismatch", label: "The project scope doesn't match my skills" },
  { value: "milestone_structure", label: "The milestone structure doesn't work for me" },
  { value: "other", label: "Other" },
];

export function OfferActions({
  offerId,
  title,
  amount,
  rateType,
  clientName,
  deadline,
  compact,
  withTerms,
}: {
  offerId: string;
  title: string;
  amount: number;
  rateType: "fixed" | "hourly";
  clientName: string;
  deadline: string | null;
  compact?: boolean; // smaller buttons for list cards
  // Detail page: show the Terms-of-Service checkbox (required before Accept)
  // and the "Request changes" button.
  withTerms?: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"accept" | "decline" | null>(null);
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const declineValid =
    !!reason && (reason !== "other" || custom.trim().length >= 10);

  const doAccept = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await acceptOffer(offerId).catch(() => ({
      ok: false,
      error: "Something went wrong. Please try again.",
    }));
    if (res.ok) {
      // Straight to the contract workspace — the work starts there.
      const cid = ("contractId" in res && res.contractId) || offerId;
      setDone("accepted");
      setContractId(cid);
      setModal(null);
      router.push(`/contracts/${cid}`);
      router.refresh();
    } else {
      setBusy(false);
      setErr(res.error || "Couldn't accept the offer.");
    }
  };

  const doDecline = async () => {
    if (!declineValid || busy) return;
    setErr(null);
    setBusy(true);
    const res = await declineOffer(offerId, reason, custom).catch(() => ({
      ok: false,
      error: "Something went wrong. Please try again.",
    }));
    setBusy(false);
    if (res.ok) {
      setDone("declined");
      setModal(null);
      router.refresh();
    } else {
      setErr(res.error || "Couldn't decline the offer.");
    }
  };

  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "No deadline";

  // In-place success states (the page also re-renders via refresh).
  if (done === "accepted") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
        <p className="text-sm font-medium text-foreground">
          🎉 Offer accepted! Your contract is now active.
        </p>
        <Link
          href={`/contracts/${contractId ?? offerId}`}
          className="inline-block mt-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
        >
          Go to Contract →
        </Link>
      </div>
    );
  }
  if (done === "declined") {
    return (
      <div className="rounded-xl border border-border bg-secondary p-4">
        <p className="text-sm text-foreground">❌ You declined this offer.</p>
        <Link
          href="/jobs"
          className="inline-block mt-2 border border-border text-foreground rounded-full px-5 py-2 text-sm font-semibold hover:bg-card"
        >
          Browse Matching Jobs →
        </Link>
      </div>
    );
  }

  const size = compact
    ? "px-4 py-2 text-sm"
    : "px-6 py-3 w-full text-base";

  return (
    <>
      {withTerms && (
        <div className="rounded-xl border border-border bg-secondary/40 p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            Terms of Service
          </p>
          <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--primary)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="underline hover:no-underline">
                Xwork Terms of Service
              </Link>{" "}
              and the{" "}
              <Link
                href="/user-agreement"
                className="underline hover:no-underline"
              >
                User Agreement
              </Link>
              , and will only accept payments for this contract on Xwork.
            </span>
          </label>
        </div>
      )}

      <div
        className={
          compact
            ? "flex items-center gap-3"
            : withTerms
              ? "flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              : "grid grid-cols-1 sm:grid-cols-2 gap-4"
        }
      >
        <button
          type="button"
          onClick={() => setModal("accept")}
          disabled={withTerms && !agreed}
          title={
            withTerms && !agreed
              ? "Tick the Terms of Service box to accept"
              : undefined
          }
          className={`bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${
            withTerms ? "px-6 py-3 text-base" : size
          }`}
        >
          ✅ Accept Offer
        </button>
        <button
          type="button"
          onClick={() => setModal("decline")}
          className={`border border-red-300 text-red-600 rounded-full font-semibold hover:bg-red-50 ${
            withTerms ? "px-6 py-3 text-base" : size
          }`}
        >
          ❌ Decline Offer
        </button>
      </div>
      {err && !modal && <p className="text-sm text-red-500 mt-2">{err}</p>}

      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
              setModal(null);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
          >
            {modal === "accept" ? (
              <>
                <h2 className="text-xl font-bold text-foreground">
                  Accept this Job Offer?
                </h2>
                <div className="mt-4 rounded-xl bg-secondary p-4 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Job:</span>{" "}
                    <span className="text-foreground font-medium">{title}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Rate:</span>{" "}
                    <span className="text-foreground font-medium">
                      ${amount} {rateType === "hourly" ? "Hourly" : "Fixed"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Client:</span>{" "}
                    <span className="text-foreground font-medium">
                      {clientName}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Deadline:</span>{" "}
                    <span className="text-foreground font-medium">
                      {fmt(deadline)}
                    </span>
                  </p>
                </div>
                {err && <p className="text-sm text-red-500 mt-3">{err}</p>}
                <div className="flex items-center justify-end gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="text-foreground font-medium hover:underline text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={doAccept}
                    disabled={busy}
                    className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "Accepting…" : "Yes, Accept Offer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground">
                  Decline this Offer
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Please let us know why you&apos;re declining.
                </p>
                <div className="mt-4 space-y-2">
                  {DECLINE_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className="flex items-center gap-3 text-sm text-foreground cursor-pointer rounded-lg border border-border px-3 py-2.5 hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <input
                        type="radio"
                        name={`offer-decline-${offerId}`}
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
                    onClick={() => setModal(null)}
                    className="text-foreground font-medium hover:underline text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={doDecline}
                    disabled={!declineValid || busy}
                    className="bg-red-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? "Declining…" : "Decline Offer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
