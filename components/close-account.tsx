"use client";

import { sendCloseOtp, closeAccountWithOtp } from "@/app/settings/actions";

export function CloseAccount({
  email,
  otpSent,
  otpError,
}: {
  email: string;
  otpSent?: boolean;
  otpError?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">Close account</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl">
        Permanently close your account. We&apos;ll email a one-time code to{" "}
        <strong className="text-foreground">{email}</strong> to confirm. Once
        closed you won&apos;t be able to sign up again with this email.
      </p>

      {!otpSent ? (
        <form action={sendCloseOtp} className="mt-4">
          <button className="border border-destructive text-destructive px-5 py-2.5 rounded-full font-medium hover:bg-destructive/10">
            Close account
          </button>
        </form>
      ) : (
        <form action={closeAccountWithOtp} className="mt-4 space-y-3 max-w-md">
          {otpError && (
            <p className="text-sm text-destructive">
              That code wasn&apos;t valid. Check your email and try again.
            </p>
          )}
          <p className="text-sm text-foreground">
            Enter the 6-digit code we emailed to {email}.
          </p>
          <input
            name="otp"
            inputMode="numeric"
            placeholder="Enter code"
            required
            className="w-full bg-background border border-border text-foreground rounded-lg p-3 tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-destructive text-destructive-foreground px-5 py-2.5 rounded-full font-medium hover:opacity-90"
            >
              Confirm &amp; close account
            </button>
            <button
              type="submit"
              formAction={sendCloseOtp}
              className="text-foreground px-4 py-2.5 rounded-full font-medium hover:bg-secondary"
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
