import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { OperatorNote } from "@/components/operator-note";

export const metadata = {
  title: "User Agreement | Xwork",
};

// Original copy. Modeled on the topics a freelance-marketplace agreement
// covers, but written from scratch — not copied from any other platform.
// Typography per spec: main header 20px, section headings 14px, body 10px.

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Introduction and acceptance",
    body: [
      "This User Agreement (the \"Agreement\") is a contract between you and Xwork and governs your access to and use of the Xwork website, apps and services (together, the \"Site\"). It applies to everyone who uses the Site, whether as a freelancer, a client, or a visitor.",
      "Where our Terms of Service set out the general legal rules for everyone, this Agreement focuses on how the marketplace actually works for clients and freelancers — how you find work, hire, get paid, and resolve problems. It should be read together with our Terms of Service, Privacy Policy and Refund Policy, which are all part of your agreement with us.",
      "By creating an account, clicking to accept, or otherwise using the Site, you confirm that you have read, understood, and agree to be bound by this Agreement and those policies. If you do not agree, you must not use the Site.",
    ],
  },
  {
    heading: "2. Eligibility and your account",
    body: [
      "You must be at least 18 years old and able to form a legally binding contract to use Xwork. You agree to provide accurate, current and complete information when you register and to keep it up to date.",
      "You can join as a client, a freelancer, or both using separate accounts. You are responsible for all activity that happens under your account and for keeping your password secure; we strongly recommend turning on two-step verification in your security settings. One person or business may not maintain more than one account of the same type without our permission, and you may not transfer, sell or share your account.",
    ],
  },
  {
    heading: "3. The role of Xwork",
    body: [
      "Xwork is a marketplace that helps clients and freelancers find each other, agree on work, communicate, and pay or get paid. Xwork is not a party to the contracts formed between clients and freelancers, is not an employer, agency or recruiter, and does not employ freelancers.",
      "Because work is performed directly between users, Xwork does not control and is not responsible for the quality, safety, legality, or timing of the services that users provide or receive. Each user is responsible for evaluating the people they choose to work with and for their own compliance with the law.",
    ],
  },
  {
    heading: "4. Creating a freelancer profile",
    body: [
      "Freelancers build a profile describing their skills, experience, portfolio and rate. Your profile must describe you truthfully and represent your own work. Profile photos must be a genuine image of you — logos, clip-art, group photos and heavily-altered images aren't allowed.",
      "A more complete profile helps clients trust and find you. Profile completeness, your title, skills and portfolio all affect how you appear in search and recommendations.",
      "You control your profile's visibility from your settings. On the Basic plan, a profile that stays inactive for an extended period may be hidden from search automatically until you return; Pro members' profiles remain visible regardless of activity. Pro members may also set a custom profile URL (which deactivates if the membership ends, though your chosen name is kept for you) and may choose to hide their total earnings from their public profile.",
    ],
  },
  {
    heading: "5. Finding and applying for work",
    body: [
      "Browsing jobs and applying are completely free. Xwork does not charge any fee, credits or \"connects\" to submit a proposal — you can apply to any open job at no cost.",
      "To keep things fair, each job accepts proposals from the first 50 freelancers who apply, on a first-come, first-served basis. Once a job reaches 50 applicants it stops accepting new proposals and no longer appears in the job feed. Proposals should be genuine, relevant and respectful; spammy or copy-pasted proposals may be removed.",
      "Some discovery features are part of the Pro membership: Pro members can see the range of bids already placed on a job, receive personalized alerts when a verified client posts work matching their skills, and see insights on how their submitted proposals are performing. Pro members' proposals are also shown ahead of Basic members' proposals in a client's list, marked with a Pro badge. None of this changes a client's freedom to hire whoever they choose.",
    ],
  },
  {
    heading: "6. Posting jobs and hiring (clients)",
    body: [
      "Clients can post fixed-price jobs for free, review the proposals they receive, compare freelancer profiles, ratings and work history, and send an offer to hire. When you hire, you and the freelancer enter a direct contract on the scope, price, milestones and timing you agree.",
      "You are responsible for the accuracy and legality of your job posts and for treating freelancers fairly and professionally. Jobs must describe genuine work and must not be used to recruit off-platform, advertise, or collect free work or information.",
    ],
  },
  {
    heading: "7. Service fees and Pro membership",
    body: [
      "Creating an account, browsing, posting jobs and applying for work are free. Xwork charges a service fee of 2% to clients on amounts they pay through the Site. Freelancers pay a marketplace fee based on their plan: 10% on the free Basic plan, or 5% with an active Pro membership. The fee is deducted from the freelancer's earnings when a payment is released, using the plan active at that moment, and the breakdown is always shown in your earnings history.",
      "Pro is an optional freelancer membership (currently $20 USD per month) that unlocks the reduced 5% fee plus extra tools — bid-range visibility, personalized job alerts, proposal insights, a custom profile URL, an always-active profile, earnings privacy control, a Pro badge, and priority placement of proposals. It renews every 30 days and can be paid from your available balance, a saved card, or PayPal. Cancel anytime and keep Pro until the end of the paid period; if a renewal cannot be collected after a short grace period (currently 3 days), the account returns to Basic automatically.",
      "There are no hidden charges, and you only pay when money changes hands or when you choose a paid membership. We will give reasonable advance notice of any change to our fees, and continuing to use the Site after a change takes effect means you accept the new fees.",
    ],
  },
  {
    heading: "8. Payment protection and escrow",
    body: [
      "Xwork supports fixed-price work protected by escrow. For each milestone, the client deposits the agreed amount into escrow before the freelancer begins. The money is held securely and is not paid to the freelancer until the work is approved.",
      "When the client approves a milestone, the escrowed amount (less the freelancer service fee) is released to the freelancer's available balance. This protects clients, who only pay for work they approve, and freelancers, who can see funds are secured before they start. Released payments are generally final, subject to our Refund Policy.",
    ],
  },
  {
    heading: "9. Contracts and ownership of work",
    body: [
      "When a client hires a freelancer, the two of them form a direct contract and are each expected to honour its terms and communicate honestly and professionally. Use Xwork's messaging, files and milestones to keep everything in one place.",
      "Unless the parties agree otherwise in writing, and subject to full payment, ownership of the deliverables created specifically for a client transfers to that client once payment for them is released. Until then, the work product remains the freelancer's. Freelancers keep ownership of their pre-existing tools and know-how and may license those where used in a deliverable.",
    ],
  },
  {
    heading: "10. Refunds, cancellations and disputes",
    body: [
      "Funds held in escrow that have not yet been released can be refunded by mutual agreement or through our dispute process. When a dispute is raised, the affected funds are held while both sides submit their account and Xwork (or a neutral mediator) helps reach a fair outcome — which may be a full refund, a full release, or a split that reflects the work actually done.",
      "Our full Refund Policy explains exactly when refunds are available, how to request one, how service fees are treated, and the timelines involved. Please review it — it forms part of this Agreement.",
    ],
  },
  {
    heading: "11. Getting paid and withdrawals",
    body: [
      "Freelancers can add a payout method — such as PayPal, Payoneer or a bank account — and withdraw their available balance once their identity is verified. For your security, Xwork stores only a masked reference to your method (for example, the last four digits) and never your full account number.",
      "Withdrawals may be subject to minimum amounts, holding periods, verification checks and processing times that vary by provider. Funds tied to an open dispute or a security review may be unavailable until the matter is resolved.",
    ],
  },
  {
    heading: "12. Taxes",
    body: [
      "You are solely responsible for determining, reporting and paying any taxes on the income you earn or payments you make through Xwork. We may ask you to provide tax information (such as a W-9, W-8BEN or local equivalent) and may withhold or report amounts where the law requires it. Xwork does not provide tax advice — please consult a qualified professional.",
    ],
  },
  {
    heading: "13. Identity verification",
    body: [
      "To keep the marketplace trustworthy and to enable secure payouts, Xwork may ask you to verify your identity, for example by confirming your date of birth or providing a government-issued document. The details you provide must match your identification exactly.",
      "Freelancers must verify their identity before they can be paid, and may be asked to verify before applying. We may limit or pause certain activities — such as applying to jobs or withdrawing funds — until verification is complete.",
    ],
  },
  {
    heading: "14. Reviews, Job Success Score, badges and account health",
    body: [
      "After a contract ends, clients and freelancers may leave honest ratings and reviews based on their genuine experience. Reviews must be truthful and must not be traded, incentivised or manipulated.",
      "Xwork calculates trust signals from your on-platform activity to help others make decisions: a Job Success Score, refreshed on a rolling cycle (currently about every 15 days), and talent badges — Rising Talent, Top Rated and Top Rated Plus — which are awarded and removed automatically against published criteria (feedback, earnings, activity and account standing). Badges and scores may change as your history changes.",
      "Every freelancer account also has an account-health score. It starts at 100% and is reduced only by recorded security and policy violations, upheld complaints, and poor client reviews — profile completeness never affects it. Positive activity (verified identity, completed jobs, great reviews, Pro membership, a clean record) helps it recover. Your Account Health page shows your score, every violation affecting it, and how to improve; violations you believe are mistaken can be appealed through support.",
    ],
  },
  {
    heading: "15. Keeping communication and payments on Xwork",
    body: [
      "Please keep your conversations and payments on Xwork. Don't share personal contact details (emails, phone numbers or external links) or arrange to pay or be paid outside the platform. Keeping everything on Xwork is what lets us protect your payments and step in if something goes wrong — it's for your benefit.",
      "We enforce this with a five-strike policy. If our system detects a message that tries to move contact or payment off Xwork, that message isn't delivered and you receive a warning; a red notice showing your warning count appears on your profile and we email the address on your account. After five warnings the account is permanently suspended and can no longer send messages or apply to jobs. Keep things on Xwork and you'll never see a warning.",
    ],
  },
  {
    heading: "16. Non-circumvention",
    body: [
      "Relationships that begin on Xwork should stay on Xwork. You agree not to solicit, or accept a solicitation, to take a relationship that started on the Site off-platform to avoid fees, for a reasonable period after being introduced through the Site. Circumventing the Site to avoid fees is a serious breach and may lead to suspension or closure of your account.",
      "Circumvention also costs you your talent badge: directing or accepting payment outside Xwork, or repeatedly moving communication off the platform before a contract is in place, removes any Rising Talent, Top Rated or Top Rated Plus badge, and you will not be eligible to earn one again for six months.",
    ],
  },
  {
    heading: "17. Acceptable use and prohibited conduct",
    body: [
      "You agree to use Xwork lawfully and respectfully. You must not: post false, misleading or fraudulent information; harass, abuse, threaten or discriminate against others; share another person's private information; create fake jobs, proposals, reviews or accounts; upload malicious code; bypass our fees or payment system; or use the Site for any illegal purpose.",
      "We may remove content and restrict, suspend or close accounts that break these rules or put other users at risk.",
    ],
  },
  {
    heading: "18. Intellectual property in the Site",
    body: [
      "The Xwork name, logo, and the Site's design, text and software are owned by Xwork and protected by law. You may not copy, modify, or distribute them without our permission.",
      "You keep the rights to the content you submit, but you grant Xwork a licence to host, store and display that content as needed to operate and promote the Site.",
    ],
  },
  {
    heading: "19. Suspension and termination",
    body: [
      "You may close your account at any time from your settings. Closing your account doesn't cancel obligations that already exist, such as completing funded work, paying amounts owed, or resolving an open dispute.",
      "We may warn, limit, suspend or terminate access where you breach this Agreement, create risk for other users, or use the Site in a way we reasonably believe is harmful or unlawful. Provisions that should survive termination — such as fees owed, intellectual property and limitations of liability — will continue to apply.",
    ],
  },
  {
    heading: "20. Disclaimers and limitation of liability",
    body: [
      "The Site is provided \"as is\" and \"as available\" without warranties of any kind. To the fullest extent permitted by law, Xwork is not liable for indirect, incidental, special or consequential damages, or for the acts, content, or omissions of any user, and our total liability is limited as set out in our Terms of Service.",
      "Nothing in this Agreement excludes liability that cannot be excluded under applicable law.",
    ],
  },
  {
    heading: "21. Privacy",
    body: [
      "Your use of the Site is also governed by our Privacy Policy, which explains what information we collect and how we use it. By using Xwork you consent to those practices.",
    ],
  },
  {
    heading: "22. Where Xwork is available (sanctions and export controls)",
    body: [
      "Xwork is not available everywhere. You may use the Site only where the law permits, and you may not use it if you are located in or ordinarily resident in a sanctioned country or region, or if you are named on any applicable sanctions or restricted-party list.",
      "You agree to comply with all applicable export-control, trade and sanctions laws. We may restrict, suspend or close accounts, and may limit the countries the Site can be used from, to comply with these laws.",
    ],
  },
  {
    heading: "23. Worker classification, labour and tax compliance",
    body: [
      "Clients and freelancers deal with each other as independent parties. Each of you is solely responsible for correctly classifying your working relationship under the laws that apply to you, and for meeting any resulting obligations — including taxes, social contributions, benefits, insurance, work authorisation and licensing.",
      "Xwork makes no determination about, and is not responsible for, the classification of any working relationship between users, or for either party's failure to meet its legal obligations.",
    ],
  },
  {
    heading: "24. Anti-money laundering and verification cooperation",
    body: [
      "To keep the marketplace lawful and safe, we and our partners carry out identity, payment and anti-fraud checks. You agree to provide accurate identity, tax and payment details when asked and to cooperate with reasonable checks.",
      "We may hold, delay, refuse or reverse a transaction, or limit an account, where we reasonably suspect fraud or a breach of these requirements, or where the law requires.",
    ],
  },
  {
    heading: "25. Changes to this Agreement",
    body: [
      "We may update this Agreement from time to time. When we make material changes we will post the updated version here and update the date below. Your continued use of the Site after changes take effect means you accept the revised Agreement.",
    ],
  },
  {
    heading: "26. Contact",
    body: [
      "Questions about this Agreement can be sent to our support team through the Help Center on the Site.",
    ],
  },
];

export default async function UserAgreementPage() {
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
        {/* main header — 20px */}
        <h1 className="text-[20px] font-bold leading-tight">
          Xwork User Agreement
        </h1>
        <p className="text-[10px] text-neutral-500 mt-1">
          Last updated: July 6, 2026
        </p>
        <p className="text-[10px] text-neutral-700 leading-relaxed mt-4">
          Please read this Agreement carefully. It explains the terms and
          conditions that apply when you use Xwork as a client or a freelancer,
          including our service fees, payment protection, and the rules everyone
          on the marketplace agrees to follow. It works together with our{" "}
          <Link href="/terms" className="text-primary underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/refund-policy" className="text-primary underline">
            Refund Policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>

        <OperatorNote />

        <div className="mt-8 space-y-7">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              {/* section heading — 14px */}
              <h2 className="text-[14px] font-semibold text-neutral-900">
                {s.heading}
              </h2>
              <div className="mt-1.5 space-y-2">
                {s.body.map((p, i) => (
                  // body — 10px
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
          By using Xwork, you acknowledge that you have read and agree to this
          User Agreement.
        </p>
      </div>
    </main>
  );
}
