"use client";

import { useState } from "react";
import { changePassword } from "@/app/settings/security/actions";

// "Change password" link + modal (current / new / re-enter → confirm and log
// out of all devices). Renders the trigger link inline.
export function ChangePassword() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-primary hover:underline font-medium"
      >
        Change password
      </button>
      {open && <ChangePasswordModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid =
    current.length > 0 &&
    next.length >= 8 &&
    /[\d\W]/.test(next) &&
    confirm.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("current_password", current);
    fd.set("new_password", next);
    fd.set("confirm_password", confirm);
    // On success the action signs out + redirects, so this never resolves.
    const res = await changePassword(fd);
    setBusy(false);
    if (res && !res.ok) setErr(res.error);
  };

  const field =
    "w-full bg-background border border-border text-foreground rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto py-16 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="bg-card rounded-2xl w-full max-w-md p-6 sm:p-8 my-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-foreground">Change your password</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          You&apos;ll need to log in again on all devices after changing your
          password.
        </p>

        <label className="block text-sm font-semibold text-foreground mt-5 mb-1">
          Current password
        </label>
        <input
          type="password"
          autoFocus
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setErr(null);
          }}
          className={field}
        />

        <label className="block text-sm font-semibold text-foreground mt-4 mb-1">
          New Password
        </label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              setErr(null);
            }}
            className={field + " pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowNew((s) => !s)}
            aria-label={showNew ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
          >
            {showNew ? "🙈" : "👁"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Must be at least 8 characters long, including 1 number or 1 symbol.
        </p>

        <label className="block text-sm font-semibold text-foreground mt-4 mb-1">
          Re-enter new password
        </label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErr(null);
            }}
            className={field + " pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
          >
            {showConfirm ? "🙈" : "👁"}
          </button>
        </div>

        {err && <p className="text-sm text-red-500 mt-3">{err}</p>}

        <div className="flex justify-end items-center gap-4 mt-7">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground font-medium hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || busy}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Confirm and log out"}
          </button>
        </div>
      </form>
    </div>
  );
}
