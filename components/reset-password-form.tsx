"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Completes a password reset ENTIRELY client-side. When a recovery link is
// opened, the session lives in the browser (from the URL hash the client parses
// on load, or from cookies set by /auth/callback). Updating the password with
// the browser client uses that session directly — no dependency on the session
// having propagated to the server, which is what made the old server-action
// version intermittently say "reset link has expired".
export function ResetPasswordForm() {
  const supabase = getBrowserSupabase();
  const [hasSession, setHasSession] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    // The browser client parses a recovery hash when it initialises; the
    // PASSWORD_RECOVERY / signed-in event fires once the session is ready.
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: unknown) => {
        if (active && session) {
          setHasSession(true);
          setError("");
        }
      }
    );
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: unknown } }) => {
        if (!active) return;
        if (data.session) setHasSession(true);
        // Give a hash-based session a brief moment to be parsed before we
        // decide the link is invalid.
        setTimeout(() => active && setChecked(true), 1200);
      });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    // Confirm a live recovery session before attempting the update.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setError("Your reset link has expired. Request a new one.");
      return;
    }

    setBusy(true);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (upErr) {
      setError(upErr.message || "Couldn't update your password. Please try again.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Password updated</h1>
        <p className="text-neutral-500 mb-6">
          Your password has been changed. You can now use it to log in.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90"
        >
          Continue to Xwork
        </Link>
      </div>
    );
  }

  // Link is missing/expired and no session ever arrived — guide the user to
  // request a fresh one instead of letting them type into a dead form.
  if (checked && !hasSession) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Reset link expired</h1>
        <p className="text-neutral-500 mb-6">
          This password reset link is no longer valid. Reset links expire after a
          while and can only be used once — please request a new one.
        </p>
        <Link
          href="/login"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-1">Set a new password</h1>
      <p className="text-neutral-500 text-center mb-6">
        Choose a strong password for your Xwork account.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-800 mb-1.5">
            New password
          </label>
          <PasswordInput name="password" showStrength />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-800 mb-1.5">
            Confirm new password
          </label>
          <PasswordInput name="confirm" placeholder="Re-enter password" />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-primary-foreground rounded-full py-3 px-4 font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="text-center text-neutral-600 text-sm mt-5">
        <Link href="/login" className="text-primary hover:underline font-medium">
          Back to log in
        </Link>
      </p>
    </>
  );
}
