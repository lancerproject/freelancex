"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  verifyPassword,
  getMaskedEmail,
  sendPasswordReset,
} from "@/app/settings/verify-password";

type Pending = {
  resolve: (ok: boolean) => void;
  title: string;
  description: string;
};

/**
 * Promise-based password gate. Use it to require the account password before
 * any settings change is saved:
 *
 *   const { require, modal } = usePasswordGate();
 *   ...
 *   if (!(await require())) return;   // user cancelled or wrong password
 *   // ...proceed with the save
 *   return ( <> ...your UI... {modal} </> );
 *
 * The prompt looks the same everywhere (the "Enter your current password"
 * screen), so confirming a password is consistent across the whole app.
 */
export function usePasswordGate() {
  const [pending, setPending] = useState<Pending | null>(null);

  const require = (opts?: { title?: string; description?: string }) =>
    new Promise<boolean>((resolve) => {
      setPending({
        resolve,
        title: opts?.title ?? "Enter your current password",
        description: opts?.description ?? "",
      });
    });

  const modal = pending ? (
    <PasswordConfirmModal
      title={pending.title}
      description={pending.description}
      onResult={(ok) => {
        pending.resolve(ok);
        setPending(null);
      }}
    />
  ) : null;

  return { require, modal };
}

function PasswordConfirmModal({
  title,
  description,
  onResult,
}: {
  title: string;
  description: string;
  onResult: (ok: boolean) => void;
}) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    getMaskedEmail().then(setEmail);
  }, []);

  const cancel = () => onResult(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await verifyPassword(pw);
    setBusy(false);
    if (res.ok) {
      onResult(true);
    } else {
      setErr(res.error || "Incorrect password.");
    }
  };

  const forgot = async () => {
    setResetSent(true);
    await sendPasswordReset();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={cancel}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left brand panel with a keys illustration */}
        <div className="hidden sm:flex w-44 shrink-0 bg-primary items-center justify-center">
          <span className="text-6xl" aria-hidden>
            🔑
          </span>
        </div>

        {/* Right: the password form */}
        <form onSubmit={submit} className="flex-1 p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-foreground pr-6">{title}</h2>
            <button
              type="button"
              onClick={cancel}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}

          {/* Account email + switch-account link */}
          <p className="text-sm font-semibold text-foreground mt-5">Email</p>
          <p className="text-foreground">{email || "…"}</p>
          <Link
            href="/login"
            className="text-sm text-primary hover:underline font-medium"
          >
            Not you?
          </Link>

          {/* Password field with a lock icon */}
          <label className="block text-sm font-semibold text-foreground mt-5 mb-1">
            Password
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            >
              🔒
            </span>
            <input
              type={show ? "text" : "password"}
              autoFocus
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr(null);
              }}
              placeholder="Enter your password"
              className="w-full bg-background border border-border text-foreground rounded-lg pl-9 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
            >
              {show ? "🙈" : "👁"}
            </button>
          </div>
          {err && <p className="text-sm text-red-500 mt-2">{err}</p>}

          {resetSent ? (
            <p className="text-sm text-primary mt-2">
              We&apos;ve emailed you a password reset link.
            </p>
          ) : (
            <button
              type="button"
              onClick={forgot}
              className="text-sm text-primary hover:underline font-medium mt-2"
            >
              Forgot password?
            </button>
          )}

          <div className="flex justify-end items-center gap-4 mt-7">
            <button
              type="button"
              onClick={cancel}
              className="text-foreground font-medium hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !pw}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
