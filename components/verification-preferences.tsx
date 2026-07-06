"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { saveVerificationPreferences } from "@/app/settings/security/actions";

// The ⚙ on the "Two-step verification" header → opens the
// "Set your verification preferences" dialog.
export function VerificationPreferences({
  initialMethod,
  initialFrequency,
}: {
  initialMethod: string;
  initialFrequency: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Set your verification preferences"
        className="w-9 h-9 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center justify-center"
      >
        ⚙
      </button>
      {open && (
        <PreferencesModal
          initialMethod={initialMethod}
          initialFrequency={initialFrequency}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PreferencesModal({
  initialMethod,
  initialFrequency,
  onClose,
}: {
  initialMethod: string;
  initialFrequency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [method, setMethod] = useState(initialMethod || "");
  const [frequency, setFrequency] = useState(initialFrequency || "risky");
  const [authenticatorReady, setAuthenticatorReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Only let the user pick "Authenticator app code" if they've actually
  // enrolled an authenticator. Mobile app + SMS aren't available yet.
  useEffect(() => {
    (async () => {
      const { data } = await getBrowserSupabase().auth.mfa.listFactors();
      const verified = data?.totp?.some(
        (f: { status: string }) => f.status === "verified"
      );
      setAuthenticatorReady(!!verified);
    })();
  }, []);

  const save = async () => {
    setErr(null);
    setBusy(true);
    const res = await saveVerificationPreferences(method, frequency);
    setBusy(false);
    if (!res.ok) {
      setErr("Couldn't save your preferences. Please try again.");
      return; // keep the dialog open so the change isn't silently lost
    }
    onClose();
    router.refresh();
  };

  const Radio = ({
    checked,
    disabled,
    onChange,
    label,
    note,
  }: {
    checked: boolean;
    disabled?: boolean;
    onChange?: () => void;
    label: string;
    note?: string;
  }) => (
    <label
      className={`flex items-start gap-3 py-2 ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          checked ? "border-primary" : "border-neutral-400"
        }`}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </span>
      <input
        type="radio"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={() => !disabled && onChange?.()}
      />
      <span>
        <span className="text-foreground">{label}</span>
        {note && (
          <span className="block text-xs text-muted-foreground">{note}</span>
        )}
      </span>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto py-12 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-xl p-6 sm:p-8 my-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            Set your verification preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          If we need to verify it&apos;s you, which should we try first?
        </h3>
        <div className="mt-2">
          <Radio
            label="Authenticator app code"
            note={
              authenticatorReady
                ? undefined
                : "Turn on the authenticator app below to use this."
            }
            checked={method === "authenticator"}
            disabled={!authenticatorReady}
            onChange={() => setMethod("authenticator")}
          />
          <Radio
            label="Mobile app notifications"
            note="Available once the Xwork mobile app launches."
            checked={method === "mobile"}
            disabled
          />
          <Radio
            label="SMS text messages"
            note="Coming soon."
            checked={method === "sms"}
            disabled
          />
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-6">
          When should we verify?
        </h3>
        <div className="mt-2">
          <Radio
            label="When my login or activity seems risky"
            checked={frequency === "risky"}
            onChange={() => setFrequency("risky")}
          />
          <Radio
            label="At every login and when my login or activity seems risky"
            checked={frequency === "every"}
            onChange={() => setFrequency("every")}
          />
        </div>

        {err && <p className="text-sm text-red-500 mt-4">{err}</p>}

        <div className="flex justify-end items-center gap-4 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="text-primary font-medium hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
