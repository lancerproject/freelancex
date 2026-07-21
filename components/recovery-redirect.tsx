"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

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
      // Instantiating the browser client makes @supabase/ssr parse the recovery
      // tokens from the URL hash and persist the session to cookies (so the
      // server-side set-password action can see it). Then move to the form.
      const supabase = getBrowserSupabase();
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        window.location.replace("/reset-password");
      };
      const { data: sub } = supabase.auth.onAuthStateChange(
        (event: string) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") go();
        }
      );
      // In case the session was already established before we subscribed.
      supabase.auth
        .getSession()
        .then(({ data }: { data: { session: unknown } }) => {
          if (data.session) go();
        });
      // Fallback: navigate anyway; the reset page validates the session and
      // shows a clear "link expired" message if it isn't there.
      const t = setTimeout(go, 2500);
      return () => {
        sub.subscription.unsubscribe();
        clearTimeout(t);
      };
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
