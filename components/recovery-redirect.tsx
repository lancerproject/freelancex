"use client";

import { useEffect } from "react";

// Password-recovery safety net.
//
// A Supabase recovery link is supposed to land on /auth/callback → /reset-password.
// But when the link is generated from the Supabase dashboard (or the redirect
// URL isn't allow-listed), Supabase falls back to the Site URL — the home page —
// with the recovery session in the URL (either a `#...type=recovery` hash for the
// implicit flow, or a `?code=` for PKCE). The landing page has nothing to process
// that, so the user just sees the home page.
//
// This component runs on every page and rescues those links:
//  • implicit hash → let the browser client persist the session to cookies, then
//    send the user to the set-password page;
//  • stray ?code= on the home page → hand it to the server callback, which
//    exchanges it and routes to the set-password page.
export function RecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { pathname, search, hash } = window.location;

    // The pages that already handle recovery correctly — never interfere.
    if (
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/auth/")
    ) {
      return;
    }

    const isRecoveryHash = /type=recovery/.test(hash);
    const params = new URLSearchParams(search);
    const strayCode = pathname === "/" && params.has("code");

    if (!isRecoveryHash && !strayCode) return;

    if (isRecoveryHash) {
      // Move the recovery tokens (still in the hash) to /reset-password WITHOUT
      // touching them here — the reset page's client parses the hash itself and
      // completes the update client-side. Forwarding the hash intact avoids any
      // race on persisting the session before navigating.
      window.location.replace(`/reset-password${search}${hash}`);
      return;
    }

    if (strayCode) {
      const code = params.get("code")!;
      window.location.replace(
        `/auth/callback?next=/reset-password&code=${encodeURIComponent(code)}`
      );
    }
  }, []);

  return null;
}
