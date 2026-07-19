"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Revoke every OTHER session (all devices except this one). Supabase's
// signOut({ scope: "others" }) invalidates the refresh tokens on the user's
// other devices, so they're forced to log in again — this device stays signed in.
export function SignOutOthers() {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );

  const run = async () => {
    setState("working");
    try {
      const { error } = await getBrowserSupabase().auth.signOut({
        scope: "others",
      });
      setState(error ? "error" : "done");
    } catch {
      setState("error");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={state === "working"}
        className="border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
      >
        {state === "working" ? "Signing out…" : "Sign out of all other devices"}
      </button>
      {state === "done" && (
        <p className="text-sm text-primary mt-2">
          ✓ Signed out everywhere else. Your other devices will need to log in
          again.
        </p>
      )}
      {state === "error" && (
        <p className="text-sm text-red-500 mt-2">
          Couldn&apos;t sign out the other sessions. Please try again.
        </p>
      )}
    </div>
  );
}
