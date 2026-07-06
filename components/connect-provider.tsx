"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { usePasswordGate } from "@/components/password-confirm-modal";

// "Connect" button to link a Google/Apple login to the existing account.
export function ConnectProvider({
  provider,
  connected,
  comingSoon = false,
}: {
  provider: "google" | "apple";
  connected: boolean;
  comingSoon?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { require, modal } = usePasswordGate();

  if (comingSoon && !connected) {
    return (
      <span className="text-xs text-muted-foreground rounded-full border border-border px-3 py-1.5 whitespace-nowrap">
        Coming soon
      </span>
    );
  }

  const connect = async () => {
    setErr(null);
    // Linking a new sign-in method is a security change — confirm the password.
    if (!(await require())) return;
    setBusy(true);
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings/security` },
    });
    if (error) {
      setBusy(false);
      setErr("Couldn't start linking. Please try again later.");
      return;
    }
    if (data?.url) window.location.href = data.url;
  };

  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium border border-primary/30 bg-primary/10 rounded-full px-4 py-2">
        ✓ Connected
      </span>
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={connect}
        disabled={busy}
        className="border border-primary text-primary rounded-full px-6 py-2 text-sm font-medium hover:bg-primary/10 disabled:opacity-50"
      >
        {busy ? "…" : "Connect"}
      </button>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
      {modal}
    </div>
  );
}
