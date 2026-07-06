"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTENT_PAGES } from "@/lib/content-pages";

// Compact, light footer shown across the app (login, sign-up, dashboard,
// profile, contracts, payments, settings, etc.). The dark marketing SiteFooter
// already lives on the landing page and the /[...slug] content pages, so we
// hide this one there to avoid two footers.

const COLUMNS: { label: string; href: string }[][] = [
  [
    { label: "About Us", href: "/about" },
    { label: "Feedback", href: "/feedback" },
    { label: "Trust, Safety & Security", href: "/trust-safety" },
  ],
  [
    { label: "Help & Support", href: "/help" },
    { label: "Terms of Service", href: "/terms" },
    { label: "User Agreement", href: "/user-agreement" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Acceptable Use Policy", href: "/acceptable-use" },
  ],
  [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "CA Notice at Collection", href: "/ca-notice" },
    { label: "Your Privacy Choices", href: "/your-privacy-choices" },
    { label: "Accessibility", href: "/accessibility" },
  ],
  [
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Legal Center", href: "/legal" },
    { label: "Release notes", href: "/release-notes" },
  ],
];

const SOCIALS: { label: string; href: string; path: React.ReactNode }[] = [
  { label: "Facebook", href: "https://facebook.com", path: <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h2.5l.5-3H14V9.5c0-.3.2-.5.5-.5z" /> },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 014 0v4M11 11v6" />
      </>
    ),
  },
  { label: "X", href: "https://x.com", path: <path d="M4 4l16 16M20 4L4 20" /> },
  {
    label: "YouTube",
    href: "https://youtube.com",
    path: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M11 9l4 3-4 3z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="16.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

// Pages that already render the dark marketing SiteFooter — skip there.
const MARKETING = new Set<string>([
  "/",
  "/hire",
  "/pricing",
  "/help",
  ...Object.keys(CONTENT_PAGES).map((k) => `/${k}`),
]);
// /terms and /privacy now have their own dedicated pages (no SiteFooter),
// so the app footer SHOULD appear on them.
["/terms", "/privacy"].forEach((p) => MARKETING.delete(p));

export function AppFooter() {
  const pathname = usePathname() || "/";
  if (
    MARKETING.has(pathname) ||
    pathname.startsWith("/help/") ||
    // Messages is a full-viewport workspace sized to fit exactly under the
    // sticky navbar — a footer below it makes the page scroll and pushes the
    // frozen bar out of view.
    pathname.startsWith("/messages")
  ) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-neutral-200 text-neutral-600">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-12">
        {/* link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
          {COLUMNS.map((col, i) => (
            <ul key={i} className="space-y-3 text-sm">
              {col.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-primary hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* social + mobile app */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-10">
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">Follow Us</span>
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {s.path}
                </svg>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">Mobile app</span>
            <Link href="/mobile-app" aria-label="iOS app" className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:opacity-80">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M16 13c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.6-.9 2.3-1.9c.5-.7.7-1.4.7-1.4s-1.4-.6-1.9-2zM14.5 6.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z" />
              </svg>
            </Link>
            <Link href="/mobile-app" aria-label="Android app" className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:opacity-80">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M6 9v7a1 1 0 001 1h1v3a1 1 0 002 0v-3h2v3a1 1 0 002 0v-3h1a1 1 0 001-1V9H6zM4 9a1 1 0 012 0v5a1 1 0 01-2 0V9zM18 9a1 1 0 012 0v5a1 1 0 01-2 0V9zM8.5 7l-1-1.7a.3.3 0 01.4-.4l1.1.6a4 4 0 012 0l1.1-.6a.3.3 0 01.4.4L11 7H8.5zM6 8h12a6 6 0 00-12 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* copyright */}
        <p className="text-xs text-neutral-500 mt-8">© 2015 – 2026 Xwork Global LLC</p>
      </div>
    </footer>
  );
}
