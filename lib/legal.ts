// ─────────────────────────────────────────────────────────────────────────
// OPERATOR DETAILS — FILL THESE IN BEFORE LAUNCH.
// These appear on every legal page (Terms, User Agreement, Privacy, Refund,
// Cookie Policy). Editing them here updates all of those pages at once.
//
//   entity       — your registered legal company name (e.g. "Xwork Ltd.")
//   address      — your registered business address (street, city, country)
//   email        — the contact address for legal/privacy questions
//   jurisdiction — the country/state whose laws govern the agreements and
//                  whose courts handle disputes (e.g. "England and Wales")
//
// Leave a field as an empty string and it simply won't be shown on the page,
// so nothing looks broken before you fill it in — but for a real launch you
// should complete all four.
// ─────────────────────────────────────────────────────────────────────────

export const OPERATOR = {
  entity: "Xwork",
  address: "",
  email: "legal@xwork.example",
  jurisdiction: "",
};

// The list of legal documents, used by the footer and the Legal Center hub.
export const LEGAL_DOCS: { label: string; href: string; blurb: string }[] = [
  {
    label: "Terms of Service",
    href: "/terms",
    blurb: "The general rules for using Xwork.",
  },
  {
    label: "User Agreement",
    href: "/user-agreement",
    blurb: "How the marketplace works for clients and freelancers.",
  },
  {
    label: "Privacy Policy",
    href: "/privacy",
    blurb: "What data we collect and how we use it.",
  },
  {
    label: "Refund Policy",
    href: "/refund-policy",
    blurb: "How payments, escrow, refunds and disputes work.",
  },
  {
    label: "Acceptable Use Policy",
    href: "/acceptable-use",
    blurb: "What's allowed — and what isn't — on Xwork.",
  },
  {
    label: "Cookie Policy",
    href: "/cookie-policy",
    blurb: "How and why we use cookies.",
  },
  {
    label: "Accessibility",
    href: "/accessibility",
    blurb: "Our commitment to an accessible platform.",
  },
];
