"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resendVerification } from "./actions";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const email = useSearchParams().get("email") || "your email";
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [help, setHelp] = useState(false);

  const resend = () => {
    setSent(false);
    start(async () => {
      await resendVerification(email);
      setSent(true);
    });
  };

  return (
    <main className="min-h-screen flex flex-col bg-white text-neutral-900">
      <div className="px-8 py-5">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center -mt-10">
        <div className="text-6xl mb-6">📧</div>
        <h1 className="text-3xl font-bold">Verify your email to continue</h1>
        <p className="text-neutral-600 mt-4 max-w-md">
          We just sent an email to the address:{" "}
          <span className="font-semibold text-neutral-900">{email}</span>
        </p>
        <p className="text-neutral-600 max-w-md">
          Please check your email and select the link provided to verify your
          address.
        </p>

        {sent && (
          <p className="text-primary text-sm mt-4">
            ✓ Verification email sent again.
          </p>
        )}

        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="mt-6 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send again"}
        </button>

        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          className="mt-6 text-sm font-medium text-neutral-800 underline hover:no-underline"
        >
          Didn&apos;t receive email?
        </button>
        {help && (
          <div className="mt-3 max-w-md text-sm text-neutral-500 space-y-1">
            <p>• Check your spam or junk folder.</p>
            <p>• Make sure {email} is spelled correctly.</p>
            <p>• Wait a minute, then tap “Send again”.</p>
          </div>
        )}

        <Link
          href="/dashboard"
          className="mt-8 text-sm text-neutral-400 hover:text-neutral-700"
        >
          Already verified? Continue to Xwork →
        </Link>
      </div>
    </main>
  );
}
