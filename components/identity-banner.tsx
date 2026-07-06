"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTENT_PAGES } from "@/lib/content-pages";

// The verification line is ONLY for a freelancer inside their working areas
// (dashboard, profile, jobs, proposals, contracts, finances, messages, settings,
// …). It must NEVER appear on marketing / content / legal / help / auth pages.
// The SAME banner is used on every app page (including the home dashboard) so
// the wording, colour, and width are identical everywhere.

// Marketing / content / legal pages — never show the line here.
const NON_APP = new Set<string>([
  "/",
  "/login",
  "/hire",
  "/pricing",
  "/help",
  "/terms",
  "/privacy",
  "/user-agreement",
  "/cookie-policy",
  "/trust-safety",
  // every footer content page (feedback, about, ca-notice, accessibility,
  // your-privacy-choices, release-notes, etc.)
  ...Object.keys(CONTENT_PAGES).map((k) => `/${k}`),
]);

export function IdentityBanner() {
  const pathname = usePathname() || "/";
  const hidden =
    NON_APP.has(pathname) ||
    pathname.startsWith("/help/") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/create-profile") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/verified") ||
    pathname.startsWith("/get-started") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/role") ||
    pathname.startsWith("/auth") ||
    // Messages is a full-viewport workspace sized to the navbar height —
    // a banner would push the chat input below the fold.
    pathname.startsWith("/messages");
  if (hidden) return null;

  // Matches the home-page verification line exactly: a rounded pill with a gap,
  // purple link, same wording — one consistent look across the whole site.
  return (
    <div className="w-full max-w-[1480px] mx-auto px-4 lg:px-8 pt-6">
      <IdentityBannerContent />
    </div>
  );
}

// The pill itself, for surfaces that place it inside their own layout (the
// Messages workspace is height-locked to the viewport, so it embeds this
// instead of the root-level banner). Same look everywhere.
export function IdentityBannerContent() {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center gap-2 text-sm">
      <span aria-hidden>⚠</span>
      <span className="text-foreground">
        You need to verify your identity to keep applying and getting paid on
        Xwork.
      </span>
      <Link
        href="/settings/identity"
        className="font-semibold text-primary underline hover:no-underline ml-1"
      >
        Verify your identity
      </Link>
    </div>
  );
}
