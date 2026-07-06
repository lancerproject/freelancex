import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { OperatorNote } from "@/components/operator-note";

export const metadata = {
  title: "Privacy Policy | Xwork",
};

// Original copy — written from scratch, not copied from any other platform.
// Typography per spec: main header 20px, section headings 14px, body 10px.

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Introduction and scope",
    body: [
      "This Privacy Policy explains what information Xwork collects when you use our website, applications and services (the \"Site\"), how and why we use it, who we share it with, how long we keep it, and the choices and rights you have. It applies to clients, freelancers and visitors.",
      "This Policy works alongside our Terms of Service, User Agreement and Refund Policy. By using the Site you acknowledge the practices described here. If you do not agree, please do not use the Site.",
    ],
  },
  {
    heading: "2. Information you provide to us",
    body: [
      "Account information: your name, email address, password, the role you choose (client or freelancer), and country. If you sign in with Google, we receive basic profile information from that sign-in.",
      "Profile information: details you add such as your professional title, overview, skills, portfolio, work and education history, languages, hourly rate, availability, profile photo and (optionally) a video introduction.",
      "Identity verification information: when a freelancer verifies their identity, we (and our verification providers) process information such as your date of birth, address and a government-issued document, so we can confirm who you are, enable payouts and help prevent fraud.",
      "Payment and payout information: the details needed to fund escrow, pay service fees, pay for a Pro membership and pay out earnings. Full card and bank numbers are handled by our payment and payout providers — if you save a card for membership billing, the card itself is stored by our payment processor and Xwork keeps only the brand and last four digits; if you connect PayPal, we store the connected PayPal email. We never store full card or bank numbers.",
      "Tax information: where required, details you enter on a tax form (such as a W-9, W-8BEN or local equivalent).",
      "Content and communications: job posts, proposals, contracts, milestones, messages and any files or attachments you send through the Site, plus reviews you write, and anything you send us through support or feedback.",
    ],
  },
  {
    heading: "3. Information we collect automatically",
    body: [
      "Usage information: how you interact with the Site — pages and jobs viewed, searches, proposals, applications, and feature use — which helps us operate and improve the marketplace.",
      "Device and log information: technical data such as your IP address, browser type, device and operating system, approximate location derived from your IP, time-zone, and timestamps of activity, including sign-in and registration events which we log for security.",
      "Activity and interaction records: signals the marketplace runs on, such as when a client first views a proposal, how recently an account was active, profile-view events (which profile was viewed, by whom, and from which job, used to power aggregate insights for the profile owner), and the payment records behind your earnings and membership billing history.",
      "Cookies and similar technologies: small files that keep you signed in, remember your preferences (such as light or dark theme), and help us understand how the Site is used. See the Cookies section below.",
    ],
  },
  {
    heading: "4. Information we receive from others",
    body: [
      "We may receive information about you from third parties that help us run the Site, including identity-verification providers, payment and payout providers, sign-in providers (such as Google when you choose to use it), and security or anti-fraud services. We combine this with the information above to operate the Site, confirm identity, and keep accounts safe.",
      "As part of our security checks, when you register or sign in we may send your IP address to specialised IP-reputation services, which tell us whether that network is a known VPN, proxy or source of abuse, and which country it belongs to. These providers receive only what they need to answer that question; results are used solely for fraud prevention and account security.",
    ],
  },
  {
    heading: "5. How we use your information",
    body: [
      "To run the marketplace: create and manage your account and profile, post jobs, submit proposals, form contracts, exchange messages and files, and display profiles, reviews and trust signals to other users.",
      "To process payments: fund and release escrow, charge and deduct our service fees (2% to clients; 10% for Basic freelancers or 5% for Pro members), bill and renew Pro memberships using your chosen method (available balance, saved card or PayPal), enable withdrawals to your payout method, keep a complete record of every payment event, and handle refunds and disputes.",
      "To verify identity and keep Xwork safe: confirm who freelancers are, detect and prevent fraud — including automated checks on network reputation (VPN/proxy detection), registration email domains, document-versus-profile country, and multiple accounts on one network — and enforce our policies, including detecting attempts to move contact or payment off-platform, recording confirmed breaches as violations on the account's health score, and suspending accounts where necessary.",
      "To calculate trust signals: compute ratings, the Job Success Score (refreshed roughly every 15 days), talent badges such as Rising Talent, Top Rated and Top Rated Plus, and the account-health score, from your on-platform activity, to help users decide who to work with and to keep the marketplace safe.",
      "To support, secure and improve the Site: provide customer support, enable two-step verification, send you service messages and notifications (including, for Pro members who keep them switched on, personalized job alerts when a verified client posts matching work), and analyse usage to fix problems and build new features.",
      "To communicate with you: with your consent where required, we may send helpful tips and job or talent suggestions. You can opt out of non-essential messages at any time; we will still send essential service messages about your account, payments and security.",
    ],
  },
  {
    heading: "6. Legal bases for processing (EEA/UK users)",
    body: [
      "Where data-protection law such as the GDPR applies, we rely on these legal bases: performance of a contract (to provide the Site and your account); our legitimate interests (to secure the marketplace, prevent fraud, and improve our services); your consent (for example, for certain marketing, which you can withdraw at any time); and compliance with legal obligations (such as tax, accounting and identity checks).",
    ],
  },
  {
    heading: "7. How we share your information",
    body: [
      "With other users: parts of your profile and activity are visible to others so the marketplace can work — for example, a freelancer's public profile, reviews, Job Success Score, talent and Pro badges, and the messages, proposals and files exchanged within a contract. Limited activity signals are also shared where a feature depends on them: a Pro freelancer can see whether and when their proposal was viewed, roughly how recently the client was active, and an aggregate count of profile views from a job — never the content of anyone else's private data. Pro freelancers may hide their total earnings from their public profile in settings.",
      "With service providers (subprocessors): trusted companies that host our infrastructure, process payments and payouts, verify identity, send email, and provide security and analytics, under agreements that limit their use of your information to providing services to us.",
      "For legal and safety reasons: where required by law, legal process, or to protect the rights, property or safety of Xwork, our users or the public, including to investigate fraud or policy violations.",
      "In a business transfer: if Xwork is involved in a merger, acquisition, financing or sale of assets, information may be transferred as part of that transaction, subject to this Policy.",
      "We do not sell your personal information.",
    ],
  },
  {
    heading: "8. Cookies and similar technologies",
    body: [
      "We use only the cookies needed to keep you signed in, remember preferences, and understand how the Site is used; we keep this light and do not use cookies to track you across unrelated websites. You can clear or block cookies in your browser settings, but some features — such as staying logged in — may not work without them.",
    ],
  },
  {
    heading: "9. Your rights and choices",
    body: [
      "Depending on where you live, you may have the right to access, correct, download (port), or delete your personal information, to object to or restrict certain processing, and to withdraw consent. You can view and edit much of your information directly in your account settings, manage notification preferences, turn on two-step verification, and close your account at any time.",
      "To make a request we can't handle through your settings, contact us through the Help Center. We may need to verify your identity before acting on a request, and we will respond within the time required by applicable law.",
    ],
  },
  {
    heading: "10. Region-specific disclosures",
    body: [
      "EEA and UK: you have the GDPR rights described above and may lodge a complaint with your local data-protection authority. International transfers are handled as described below.",
      "California: we do not sell or \"share\" your personal information as those terms are defined under California law. California residents may request the categories and specific pieces of personal information we have collected, request deletion or correction, and exercise these rights without discrimination. The categories we collect and the purposes are described in this Policy.",
    ],
  },
  {
    heading: "11. Data retention",
    body: [
      "We keep your information for as long as your account is active and as needed to provide the Site. We also retain certain information after account closure where necessary to complete transactions, comply with legal, tax and accounting obligations, resolve disputes, prevent fraud and enforce our agreements. When information is no longer needed, we delete or anonymise it.",
    ],
  },
  {
    heading: "12. Data security",
    body: [
      "We use reasonable technical and organisational measures to protect your information, including encryption of data in transit, access controls that limit who can see your data, optional two-step verification on your account, escrow handling of payments, and storing only masked references to payout methods. No method of transmission or storage is completely secure, so we cannot guarantee absolute security, but we work hard to protect your data and ask that you help by keeping your password safe and your account secure.",
    ],
  },
  {
    heading: "13. International transfers",
    body: [
      "Because Xwork operates globally, your information may be processed in countries other than the one you live in, including by our service providers. Where we transfer personal data across borders, we take steps to ensure it remains protected in line with this Policy and applicable law, such as using appropriate contractual safeguards.",
    ],
  },
  {
    heading: "14. Automated processing",
    body: [
      "Some features rely on automated processing — for example, calculating the Job Success Score, talent badges and account-health score, surfacing recommended jobs or talent, sending personalized job alerts, detecting messages that try to move contact or payment off-platform, and running network-reputation and identity checks that can automatically restrict or suspend an account (such as VPN or proxy use, which is not permitted). These help operate the marketplace and keep it safe; where an automated decision significantly affects you — including any violation recorded on your account health — you can contact us through support to ask questions, appeal, or request human review.",
    ],
  },
  {
    heading: "15. Third-party links and services",
    body: [
      "The Site may link to or integrate with third-party websites and services (such as payment, payout and sign-in providers) that we do not control. Their handling of your information is governed by their own privacy policies, and we encourage you to review them.",
    ],
  },
  {
    heading: "16. Children",
    body: [
      "Xwork is not intended for anyone under 18, and we do not knowingly collect information from children. If you believe a child has provided us with personal information, please contact us so we can remove it.",
    ],
  },
  {
    heading: "17. Sensitive and identity-verification information",
    body: [
      "Some information we process to verify identity — such as a government-issued document or date of birth — may be considered sensitive under certain laws. We collect it only to confirm identity, enable payouts, prevent fraud and comply with the law; we limit who can access it; and we keep it only as long as needed for those purposes. We do not use this information for advertising.",
    ],
  },
  {
    heading: "18. Data breach notification",
    body: [
      "We maintain measures designed to detect, investigate and respond to security incidents. If a breach occurs that affects your personal information, we will notify you and the relevant authorities where and as required by applicable law, and we will take reasonable steps to address the incident and limit its impact.",
    ],
  },
  {
    heading: "19. Marketing choices and tracking signals",
    body: [
      "You control non-essential communications. You can opt out of marketing emails using the unsubscribe link or your notification settings; we will still send essential messages about your account, payments and security. Because there is no common industry standard for browser \"Do Not Track\" signals, we do not currently respond to them, but we limit our use of cookies to what is described above.",
    ],
  },
  {
    heading: "20. Other regional privacy laws",
    body: [
      "Xwork operates globally, and we aim to honour the data-protection rights available to you under the laws of your country or region — in addition to the GDPR and California rights described above — including, for example, laws in the United Kingdom, Canada, Brazil, Australia and elsewhere. Where local law gives you stronger rights, those rights apply.",
    ],
  },
  {
    heading: "21. EEA/UK users and our data-protection contact",
    body: [
      "If you are in the EEA or the UK and have a question or complaint about how we handle your personal data, you can contact our privacy team through the Help Center, and you also have the right to lodge a complaint with your local data-protection authority. Where the law requires us to designate a representative or a data-protection contact, we will make those details available through the Help Center.",
    ],
  },
  {
    heading: "22. Changes to this Policy",
    body: [
      "We may update this Privacy Policy from time to time. When we make material changes we will post the updated version here and update the date below, and where appropriate we will notify you. Your continued use of the Site after changes take effect means you accept the updated Policy.",
    ],
  },
  {
    heading: "23. Contact",
    body: [
      "If you have questions about this Policy or your information, or wish to exercise your privacy rights, you can reach our support team through the Help Center on the Site, or by the contact details published there.",
    ],
  },
];

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* Only show a header when logged out — logged-in users already have the
          app navbar, so we avoid a double header. */}
      {!user && (
        <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-200">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-primary">X</span>
            <span className="text-neutral-900">work</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-primary font-medium"
          >
            Back
          </Link>
        </header>
      )}

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-[20px] font-bold leading-tight">
          Xwork Privacy Policy
        </h1>
        <p className="text-[10px] text-neutral-500 mt-1">
          Last updated: July 6, 2026
        </p>
        <p className="text-[10px] text-neutral-700 leading-relaxed mt-4">
          This Policy describes how Xwork handles your personal information. It
          works alongside our{" "}
          <Link href="/terms" className="text-primary underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/user-agreement" className="text-primary underline">
            User Agreement
          </Link>{" "}
          and{" "}
          <Link href="/refund-policy" className="text-primary underline">
            Refund Policy
          </Link>
          .
        </p>

        <OperatorNote />

        <div className="mt-8 space-y-7">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[14px] font-semibold text-neutral-900">
                {s.heading}
              </h2>
              <div className="mt-1.5 space-y-2">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-[10px] leading-relaxed text-neutral-700"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-[10px] text-neutral-500 mt-10">
          By using Xwork, you acknowledge that you have read and understood this
          Privacy Policy.
        </p>
      </div>
    </main>
  );
}
