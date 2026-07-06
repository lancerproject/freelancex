"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPhoneCode, confirmPhoneCode } from "@/app/settings/contact/actions";

// Verify the saved phone number with a 6-digit code. Until an SMS provider
// is connected the code arrives as an Xwork notification + email; with
// Twilio keys in .env it arrives by SMS automatically.

export function PhoneVerify({
  phone,
  verified,
}: {
  phone: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "code" | "done">("idle");
  const [via, setVia] = useState<"sms" | "notification">("notification");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!phone) return null;
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
        ✓ Verified
      </span>
    );
  }

  const send = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await sendPhoneCode().catch(() => ({
      ok: false as const,
      error: "Something went wrong.",
    }));
    setBusy(false);
    if (res.ok) {
      setVia(("via" in res && res.via) || "notification");
      setStep("code");
    } else {
      setErr(res.error || "Couldn't send the code.");
    }
  };

  const confirm = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await confirmPhoneCode(code).catch(() => ({
      ok: false,
      error: "Something went wrong.",
    }));
    setBusy(false);
    if (res.ok) {
      setStep("done");
      setTimeout(() => router.refresh(), 1500);
    } else {
      setErr(res.error || "Couldn't verify the code.");
    }
  };

  return (
    <span className="inline-flex flex-col gap-2">
      {step === "idle" && (
        <button
          type="button"
          disabled={busy}
          onClick={send}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50 text-left"
        >
          {busy ? "Sending code…" : "Verify this number"}
        </button>
      )}

      {step === "code" && (
        <span className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            {via === "sms"
              ? "We texted a 6-digit code to your phone."
              : "We sent a 6-digit code to your Xwork notifications and email."}
          </span>
          <span className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="w-28 bg-background border border-border text-foreground rounded-lg px-3 py-1.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              disabled={busy || code.replace(/\D/g, "").length !== 6}
              onClick={confirm}
              className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Checking…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Resend
            </button>
          </span>
        </span>
      )}

      {step === "done" && (
        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium w-fit">
          ✓ Phone verified
        </span>
      )}

      {err && <span className="text-xs text-red-500">{err}</span>}
    </span>
  );
}
