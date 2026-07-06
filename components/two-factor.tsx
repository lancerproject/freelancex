"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { recordTwoFactorChange } from "@/app/settings/security/actions";

// Real two-factor auth using Supabase's built-in TOTP MFA. Works with any
// authenticator app (Google Authenticator, 1Password, Authy, …).
export function TwoFactor() {
  const supabase = getBrowserSupabase();

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactor, setPendingFactor] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find(
      (f: { id: string; status: string }) => f.status === "verified"
    );
    setEnabled(!!verified);
    setFactorId(verified?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    // Clear any half-finished (unverified) factors first.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Couldn't start setup. Please try again.");
      return;
    }
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactor(data.id);
    setEnrolling(true);
  };

  const verify = async () => {
    if (!pendingFactor) return;
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingFactor,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      setError(error.message || "That code didn't match. Try again.");
      return;
    }
    setEnrolling(false);
    setQr(null);
    setSecret(null);
    setPendingFactor(null);
    setCode("");
    await refresh();
    await recordTwoFactorChange(true);
  };

  const cancelEnroll = async () => {
    if (pendingFactor) await supabase.auth.mfa.unenroll({ factorId: pendingFactor });
    setEnrolling(false);
    setQr(null);
    setSecret(null);
    setPendingFactor(null);
    setCode("");
    setError(null);
  };

  const disable = async () => {
    if (!factorId) return;
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      // Don't send a "disabled" notification or refresh as-off if it failed.
      setError(error.message || "Couldn't turn off two-step verification.");
      return;
    }
    await refresh();
    await recordTwoFactorChange(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground mt-4">Loading…</p>;
  }

  const toggle = () => {
    if (busy) return;
    if (enabled) disable();
    else if (!enrolling) startEnroll();
  };
  const on = enabled || enrolling;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-foreground font-medium">Authenticator app codes</p>
          <p className="text-muted-foreground text-sm">
            Verify one-time codes generated in your preferred third party
            authenticator app.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Authenticator app codes"
          onClick={toggle}
          disabled={busy}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
            on ? "bg-primary" : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {enabled && (
        <span className="inline-flex items-center gap-1.5 text-xs text-primary mt-3 font-medium">
          ✓ Two-factor authentication is on — you&apos;ll enter a code from your
          app when you sign in.
        </span>
      )}

      {enrolling && (
        <div className="mt-5 rounded-xl border border-border bg-background p-5">
          <p className="text-sm text-foreground font-medium">
            1. Scan this QR code with your authenticator app
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="Two-factor QR code"
              className="w-44 h-44 mt-3 bg-white rounded-lg p-2"
            />
          )}
          {secret && (
            <p className="text-xs text-muted-foreground mt-2 break-all">
              Or enter this key manually:{" "}
              <span className="font-mono text-foreground">{secret}</span>
            </p>
          )}

          <p className="text-sm text-foreground font-medium mt-5">
            2. Enter the 6-digit code from your app
          </p>
          <div className="flex items-center gap-3 mt-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="w-32 bg-card border border-border rounded-lg p-2.5 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Verify & enable"}
            </button>
            <button
              type="button"
              onClick={cancelEnroll}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}
