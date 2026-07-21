import Link from "next/link";

// Shared marketing footer for public pages.

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "For Clients",
    links: [
      { label: "How to hire", href: "/how-to-hire" },
      { label: "Talent Marketplace", href: "/hire" },
      { label: "Project Catalog", href: "/project-catalog" },
      { label: "Hire an agency", href: "/hire-an-agency" },
      { label: "Any Hire", href: "/hire" },
      { label: "Hire worldwide", href: "/hire" },
    ],
  },
  {
    title: "For Talent",
    links: [
      { label: "How to find work", href: "/how-to-find-work" },
      { label: "Find freelance jobs worldwide", href: "/register/freelancer" },
      { label: "Win work with ads", href: "/win-work-with-ads" },
      { label: "Freelancer resources", href: "/freelancer-resources" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help & support", href: "/help" },
      { label: "FAQ", href: "/faq" },
      { label: "Success stories", href: "/success-stories" },
      { label: "Xwork reviews", href: "/xwork-reviews" },
      { label: "Blog", href: "/blog" },
      { label: "Feedback", href: "/feedback" },
      { label: "Refer a client", href: "/refer-a-client" },
      { label: "Release notes", href: "/release-notes" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Leadership", href: "/leadership" },
      { label: "Careers", href: "/careers" },
      { label: "Our impact", href: "/impact" },
      { label: "Contact us", href: "/contact" },
      { label: "Partners", href: "/partners" },
      { label: "Trust, safety & security", href: "/trust-safety" },
    ],
  },
];

const LEGAL: { label: string; href: string }[] = [
  { label: "Legal Center", href: "/legal" },
  { label: "Terms of Service", href: "/terms" },
  { label: "User Agreement", href: "/user-agreement" },
  { label: "Freelancer Agreement", href: "/freelancer-agreement" },
  { label: "Client Agreement", href: "/client-agreement" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Acceptable Use Policy", href: "/acceptable-use" },
  { label: "Community Guidelines", href: "/community-guidelines" },
  { label: "AML & KYC Policy", href: "/aml-kyc" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "CA Notice at Collection", href: "/ca-notice" },
  { label: "Your Privacy Choices", href: "/your-privacy-choices" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Sitemap", href: "/sitemap" },
];

// Social icon paths (Follow us row). Links are placeholders for now.
const SOCIALS: { label: string; href: string; path: React.ReactNode }[] = [
  {
    label: "Facebook",
    href: "#",
    path: <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h2.5l.5-3H14V9.5c0-.3.2-.5.5-.5z" />,
  },
  {
    label: "LinkedIn",
    href: "#",
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 014 0v4M11 11v6" stroke="#000" />
      </>
    ),
  },
  {
    label: "X",
    href: "#",
    path: <path d="M4 4l16 16M20 4L4 20" />,
  },
  {
    label: "YouTube",
    href: "#",
    path: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M11 9l4 3-4 3z" fill="#000" stroke="none" />
      </>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    path: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="16.5" cy="7.5" r="1" fill="#000" stroke="none" />
      </>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-14">
        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-neutral-400 text-sm mb-4">{col.title}</p>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social + mobile app */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-12">
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400">Follow us</span>
            {SOCIALS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-8 h-8 rounded-full bg-white text-neutral-900 flex items-center justify-center hover:opacity-80"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {s.path}
                </svg>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">Mobile app</span>
            <span aria-label="iOS app" className="w-8 h-8 rounded-full bg-white text-neutral-900 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M16 13c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.6-.9 2.3-1.9c.5-.7.7-1.4.7-1.4s-1.4-.6-1.9-2zM14.5 6.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z" />
              </svg>
            </span>
            <span aria-label="Android app" className="w-8 h-8 rounded-full bg-white text-neutral-900 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M6 9v7a1 1 0 001 1h1v3a1 1 0 002 0v-3h2v3a1 1 0 002 0v-3h1a1 1 0 001-1V9H6zM4 9a1 1 0 012 0v5a1 1 0 01-2 0V9zM18 9a1 1 0 012 0v5a1 1 0 01-2 0V9zM8.5 7l-1-1.7a.3.3 0 01.4-.4l1.1.6a4 4 0 012 0l1.1-.6a.3.3 0 01.4.4L11 7H8.5zM6 8h12a6 6 0 00-12 0z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom legal bar */}
      <div className="border-t border-neutral-800">
        <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-5 flex flex-col md:flex-row md:items-center gap-3 text-xs text-neutral-400">
          <span>© 2015 - 2026 Xwork Global LLC</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
