import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Trust, Safety & Security | Xwork",
};

// Original copy modeled on the topics a trust-&-safety page covers — written
// from scratch, with Xwork's green branding. Logos are placeholder names, not
// real trademarks.

const TRUSTED = ["Northwind", "Acme", "Globex", "Initech", "Umbrella"];

const DATA_CARDS = [
  {
    title: "Data protection",
    body: "Your information is encrypted in transit and at rest, and access is tightly controlled so only the right people and systems can use it.",
    href: "/privacy",
    cta: "Read our Privacy Policy",
  },
  {
    title: "Standards & compliance",
    body: "We align our practices with widely recognised security and privacy standards, and review them regularly as the platform grows.",
    href: "/user-agreement",
    cta: "Read the User Agreement",
  },
  {
    title: "Information security",
    body: "We monitor, test, and continually improve our systems to keep the marketplace reliable and your data safe.",
    href: "/privacy",
    cta: "Learn more",
  },
];

const ACCESS_CARDS = [
  {
    title: "Strong sign-in",
    body: "Strict password rules and a clear strength meter help every account start out secure, with more protection options on the way.",
  },
  {
    title: "Verified identities",
    body: "Freelancers complete a one-time identity check before they can get paid, so both sides know who they're working with.",
  },
  {
    title: "Secure sessions",
    body: "Sessions are protected and you can log out from anywhere through your account settings at any time.",
  },
];

const ASSET_CARDS = [
  {
    title: "Data encryption",
    body: "We protect data in transit using HTTPS/TLS and keep it encrypted at rest, guarding against eavesdropping and tampering.",
  },
  {
    title: "Malware & spam protection",
    body: "Messages and uploaded files are scanned to help protect you from malicious links, attachments, and spam.",
  },
  {
    title: "Confidentiality & IP rights",
    body: "Ownership of completed, paid-for work transfers to the client, and you can agree confidentiality terms that fit your project.",
  },
];

const RESOURCES = [
  {
    tag: "Guide",
    title: "How leading teams work with freelancers",
    href: "/how-to-hire",
  },
  {
    tag: "Guide",
    title: "Working securely with remote freelancers",
    href: "/how-to-find-work",
  },
  {
    tag: "Guide",
    title: "Setting up a safe remote workflow",
    href: "/freelancer-resources",
  },
];

// Deep long-form explanation of how the marketplace is kept safe, end to end.
const PILLARS: { title: string; body: string[] }[] = [
  {
    title: "Verified identities",
    body: [
      "Trust starts with knowing who you're dealing with. Every freelancer completes a one-time identity verification before they can be paid — they submit a government-issued document and a live selfie, and our system checks that the face matches and that the name and country line up with their profile. Where an automated check can't be completed with confidence, a member of our team reviews the documents manually before approving.",
      "Each person may verify only one active account, and the same document cannot be used to verify a second account. This keeps out duplicate and throwaway accounts and makes the reputation you build genuinely yours.",
    ],
  },
  {
    title: "Payments protected by escrow",
    body: [
      "Money on Xwork is protected on both sides by escrow. On a fixed-price contract, the client funds each milestone before the freelancer begins, and the funds are held securely — not paid out — until the client approves the work. Freelancers can see the money is secured before they start; clients only ever release funds for work they've approved.",
      "If a contract ends while funds are still in escrow, those funds are handled fairly: they return to the client when work wasn't delivered, and a freelancer who believes they're owed can open a dispute that freezes the funds until it's resolved. Nothing is quietly released to the wrong party.",
    ],
  },
  {
    title: "Fraud monitoring and financial-crime checks",
    body: [
      "Behind the scenes, we run automated checks designed to detect and prevent fraud, money laundering and abuse. We look at signals such as the reputation of the network you sign in from (including whether it's a known VPN or proxy, which isn't permitted), the email domain used to register, whether an ID's issuing country matches the profile, and how many accounts share a single network.",
      "When something looks wrong, we can hold or reverse a transaction, request more information, or restrict an account while we investigate. These checks protect the honest majority from the small number who try to abuse the platform.",
    ],
  },
  {
    title: "On-platform communication and the five-strike rule",
    body: [
      "Keeping conversations and payments on Xwork is what lets us protect you — it's why escrow, dispute help and our records exist. Our system scans messages, cover letters and contract chat for attempts to move contact or payment off the platform.",
      "If a message tries to take things off-platform, it isn't delivered and you receive a warning, with a notice on your profile and an email to your account. After five warnings, the account is permanently suspended. Stay on Xwork and you'll never see a warning — and you'll keep every protection the marketplace provides.",
    ],
  },
  {
    title: "Honest reputation signals",
    body: [
      "Ratings and reviews come only from real, completed contracts, so the work history you see is genuine. On top of reviews, we compute a Job Success Score and award Rising Talent, Top Rated and Top Rated Plus badges automatically against published criteria — and remove them just as automatically when the criteria are no longer met.",
      "Reviews and scores may never be bought, sold, traded or coerced, and trying to game them — or moving payments off-platform — costs a freelancer their badge and eligibility to earn one again for six months.",
    ],
  },
  {
    title: "Fair dispute resolution",
    body: [
      "Even good working relationships sometimes hit a snag. If a client and freelancer can't resolve something directly, either side can open a dispute. The affected escrow is held while both parties share their account of what happened, and Xwork (or a neutral mediator) helps reach a fair outcome — a refund, a release, or a split that reflects the work actually done. A dispute also opens a tracked ticket in your support requests so nothing falls through the cracks.",
    ],
  },
  {
    title: "Your account, your controls",
    body: [
      "You have real tools to protect yourself: strong password requirements with a live strength meter, optional two-step verification, a security question for recovery, visibility over connected sign-in methods, and the ability to change your password or close your account at any time. Sensitive changes ask for your password before they take effect.",
      "We store only what we need and only in a safe form — for payout methods, for example, we keep a masked reference such as the last four digits, never your full account number.",
    ],
  },
  {
    title: "Data security and privacy by design",
    body: [
      "Your data is encrypted in transit and at rest, access is tightly restricted to the systems and people who genuinely need it, and identity documents are used only to verify you, enable payouts and prevent fraud — never for advertising. Our full approach to what we collect, why, and your rights over it is set out in our Privacy Policy.",
    ],
  },
  {
    title: "Reporting and responsible disclosure",
    body: [
      "Safety is a shared effort. If you see something that doesn't feel right — a suspicious job, an off-platform request, or abusive behaviour — report it through Help & support and we'll look into it quickly. If you're a security researcher and believe you've found a vulnerability, report it privately and give us a chance to fix it; good-faith disclosure is always welcome.",
    ],
  },
];

export default async function TrustSafetyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-in users have the global app navbar already; only add the marketing
  // header when logged out, to avoid a double header.
  const dashHref = user ? "/dashboard" : "/register/freelancer";
  const dashLabel = user ? "Go to your dashboard" : "Get started";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {!user && <LandingHeader />}

      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-14">
        {/* sub-nav */}
        <nav className="flex flex-wrap gap-6 text-sm text-neutral-600 mb-10">
          <span className="text-primary font-medium">Trust &amp; Safety</span>
          <Link href="/privacy" className="hover:text-primary">Security</Link>
          <Link href="/hire" className="hover:text-primary">Clients</Link>
          <Link href="/register/freelancer" className="hover:text-primary">Talent</Link>
        </nav>

        {/* hero */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-primary max-w-3xl">
            Trust, safety &amp; security
          </h1>
          <Link
            href={dashHref}
            className="shrink-0 bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold hover:opacity-90 transition"
          >
            {dashLabel}
          </Link>
        </div>

        {/* trusted by */}
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4 mt-12 pb-10 border-b border-neutral-200">
          <span className="text-sm text-neutral-500">Trusted by</span>
          {TRUSTED.map((t) => (
            <span key={t} className="text-neutral-400 font-semibold text-lg">
              {t}
            </span>
          ))}
        </div>

        {/* protecting your data */}
        <section className="mt-14">
          <h2 className="text-3xl font-bold">
            Protecting your data is our top priority
          </h2>
          <p className="text-neutral-600 mt-3 max-w-2xl">
            Xwork follows modern security and privacy best practices designed to
            give clients and freelancers a safe, reliable place to work together
            — so you can focus on the work, worry-free.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            {DATA_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 flex flex-col"
              >
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-neutral-600 mt-2 flex-1">{c.body}</p>
                <Link
                  href={c.href}
                  className="text-primary font-medium text-sm mt-4 hover:underline"
                >
                  {c.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* access and authentication */}
        <section className="mt-14">
          <h2 className="text-3xl font-bold">Access and authentication</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            {ACCESS_CARDS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-neutral-200 p-6">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-neutral-600 mt-2">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* asset protection */}
        <section className="mt-14">
          <h2 className="text-3xl font-bold">Asset protection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            {ASSET_CARDS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-neutral-200 p-6">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-neutral-600 mt-2">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how we protect you, end to end — deep long-form */}
        <section className="mt-16 border-t border-neutral-200 pt-14">
          <h2 className="text-3xl font-bold">How we keep Xwork safe, end to end</h2>
          <p className="text-neutral-600 mt-3 max-w-2xl">
            Safety on a marketplace isn&apos;t a single feature — it&apos;s a
            set of protections that work together from the moment you sign in to
            the moment you get paid. Here&apos;s the whole picture.
          </p>
          <div className="mt-10 space-y-10 max-w-3xl">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="flex gap-5">
                <span className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900">
                    {p.title}
                  </h3>
                  {p.body.map((para, j) => (
                    <p key={j} className="text-neutral-600 mt-2 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/privacy"
              className="border border-primary text-primary px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/5"
            >
              Read our Privacy Policy
            </Link>
            <Link
              href="/acceptable-use"
              className="border border-primary text-primary px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/5"
            >
              Acceptable Use Policy
            </Link>
            <Link
              href="/refund-policy"
              className="border border-primary text-primary px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/5"
            >
              Refund &amp; escrow protection
            </Link>
          </div>
        </section>

        {/* resources */}
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Resources to help you succeed</h2>
            <Link
              href="/help"
              className="shrink-0 border border-primary text-primary px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary/5"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            {RESOURCES.map((r) => (
              <div
                key={r.title}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 flex flex-col"
              >
                <span className="text-xs uppercase tracking-wide text-neutral-400">
                  {r.tag}
                </span>
                <h3 className="text-lg font-semibold mt-2 flex-1">{r.title}</h3>
                <Link
                  href={r.href}
                  className="text-primary font-medium text-sm mt-4 hover:underline"
                >
                  Read guide →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
