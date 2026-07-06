"use client";

import { useState } from "react";
import { usePasswordGate } from "@/components/password-confirm-modal";
import { sendSecurityQuestionReset } from "@/app/settings/security/security-question/actions";

// FLOW 3 entry: "Forgot Security Question?" → confirm account password →
// email a single-use reset link → show confirmation.
export function ForgotSecurityQuestion() {
  const { require, modal } = usePasswordGate();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = async () => {
    setErr(null);
    if (!(await require())) return; // wrong password / cancelled
    setBusy(true);
    const res = await sendSecurityQuestionReset();
    setBusy(false);
    if (res.ok) setSent(true);
    else setErr("Couldn't send the reset email. Please try again.");
  };

  if (sent) {
    return (
      <p className="text-sm text-primary mt-3">
        We&apos;ve sent a verification link to your email. Open it within 30
        minutes to set a new security question.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
      >
        {busy ? "Sending…" : "Forgot Security Question?"}
      </button>
      {err && <p className="text-sm text-red-500 mt-1">{err}</p>}
      {modal}
    </div>
  );
}
