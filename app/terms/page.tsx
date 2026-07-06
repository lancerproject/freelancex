import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { OperatorNote } from "@/components/operator-note";

export const metadata = {
  title: "Terms of Service | Xwork",
};

// Original copy — written from scratch, not copied from any other platform.
// Typography per spec: main header 20px, section headings 14px, body 10px.

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Acceptance of these Terms",
    body: [
      "These Terms of Service (\"Terms\") govern your access to and use of the Xwork website, mobile applications, APIs and related services (together, the \"Site\"). By creating an account, accessing, or using the Site in any way, you confirm that you have read, understood and agree to be bound by these Terms. If you do not agree, you must not use the Site.",
      "These Terms work together with our User Agreement, our Privacy Policy, our Refund Policy, and any guidelines or policies we publish and link to from the Site. Together these documents form the entire agreement between you and Xwork. Where the User Agreement sets out the specific rules for clients and freelancers, these Terms cover the general use of the Site by everyone.",
      "If you are using the Site on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms, and \"you\" refers to that entity.",
    ],
  },
  {
    heading: "2. Eligibility and who can use Xwork",
    body: [
      "You must be at least 18 years old and able to form a legally binding contract to use Xwork. You may not use the Site if you are barred from doing so under the laws of your country or any applicable sanctions or trade-control regulations.",
      "You may register as a client, as a freelancer, or as both using separate accounts. Each person or entity may hold only one account of each type, and accounts may not be shared, sold, rented or transferred to anyone else.",
      "By using the Site you represent that all registration information you provide is true, accurate and current, and that you will keep it up to date.",
    ],
  },
  {
    heading: "3. About Xwork and our role",
    body: [
      "Xwork is an online marketplace that connects clients who need work done with freelancers who provide services. We provide the platform, tools, messaging and payment system that make it possible for users to find one another and transact.",
      "Xwork is not an employer, agency, staffing firm, recruiter, or party to the agreements made between clients and freelancers. We do not perform the work, supervise it, or guarantee its quality, legality, safety or outcome. Clients and freelancers are independent of Xwork and of one another, and nothing on the Site creates an employment, partnership, joint-venture or agency relationship.",
      "Because we are not a party to contracts between users, each user is solely responsible for the agreements they enter into, the work they perform or commission, and their compliance with all applicable laws, including tax, labour, immigration and licensing rules.",
    ],
  },
  {
    heading: "4. Your account and security",
    body: [
      "To use most features you must create an account and provide accurate information. You are responsible for all activity that occurs under your account and for keeping your password and login credentials confidential.",
      "We strongly encourage you to enable two-step verification (2FA) from your security settings. You must notify us promptly if you believe your account has been accessed or used without your permission. We are not liable for losses arising from your failure to safeguard your account.",
    ],
  },
  {
    heading: "5. Identity verification",
    body: [
      "To help keep the marketplace trustworthy and to enable secure payouts, freelancers are required to complete a one-time identity verification before they can be paid, and may be asked to verify their identity before applying for work. Clients are not required to verify their identity to post jobs and hire.",
      "You agree to provide accurate verification information and authorise us (and our verification providers) to process it for the purposes of confirming your identity, preventing fraud, and complying with applicable law. We may limit or suspend access where verification cannot be completed.",
      "You may verify and maintain only one Xwork account at a time, and the same identity document may not be used to verify more than one active account. Creating additional accounts, or re-verifying in order to evade a suspension or other enforcement action, is prohibited and may result in a permanent ban from Xwork.",
    ],
  },
  {
    heading: "6. Posting jobs, proposals and applying",
    body: [
      "Clients may post fixed-price jobs at no charge. Freelancers may browse and apply to jobs free of charge — Xwork does not charge any fee, credits or \"connects\" to submit a proposal.",
      "To keep opportunities fair, each job accepts proposals from the first 50 freelancers who apply, on a first-come, first-served basis. Once a job reaches this limit it stops accepting new proposals and no longer appears in the freelancer job feed.",
      "You are responsible for the accuracy and legality of everything you post, including job descriptions, budgets, proposals, bids and portfolio items. Job posts and proposals must describe genuine work and must not be used to advertise, recruit off-platform, or mislead.",
    ],
  },
  {
    heading: "7. Contracts between clients and freelancers",
    body: [
      "When a client hires a freelancer, a direct contract is formed between those two users on the terms they agree (scope, deliverables, milestones, price and timing). Xwork provides the tools to record and manage that contract but is not itself a party to it.",
      "Clients and freelancers are each responsible for performing their obligations under their contract, for the quality and legality of the work, and for resolving questions about scope and deliverables with one another, using Xwork's dispute process where needed.",
    ],
  },
  {
    heading: "8. Fixed-price work, escrow and payment protection",
    body: [
      "Xwork supports fixed-price contracts. For each milestone, the client funds the agreed amount into escrow before the freelancer begins that milestone. Funds held in escrow are reserved for the freelancer but are not released until the work is approved.",
      "When the client approves a milestone, the escrowed funds (less applicable fees) are released to the freelancer's account balance. This protects clients, who only pay for work they approve, and freelancers, who can see that funds have been secured before they begin.",
      "Releasing, refunding and disputing escrow funds is governed by these Terms and by our Refund Policy. We may place reasonable holds on funds where required for security, fraud prevention, dispute resolution or compliance with law.",
    ],
  },
  {
    heading: "9. Service fees and Pro membership",
    body: [
      "Creating an account, browsing, posting jobs and applying for work are free. Xwork charges a service fee of 2% to clients on amounts they pay through the Site. Freelancers pay a marketplace fee that depends on their plan: 10% on the free Basic plan, or 5% with an active Pro membership. The freelancer fee is deducted from the freelancer's earnings at the moment a payment is released, using the plan in effect at that time, and every fee is shown transparently in your earnings records.",
      "Pro is an optional paid membership for freelancers, currently 20 US dollars per month. It unlocks additional features described on the membership page — including the reduced 5% marketplace fee, visibility of bid ranges on jobs, personalized job alerts, proposal insights, a custom profile URL, an always-active profile, control over the visibility of your earnings, a Pro badge, and priority placement of your proposals in client lists. We may adjust the feature set over time; material changes will be reflected on the membership page.",
      "Pro renews automatically every 30 days and can be paid from your available balance, a saved card, or a connected PayPal account. You can cancel at any time and keep Pro access until the end of the period you have paid for. If a renewal payment fails, we allow a short grace period (currently 3 days) and retry; if payment still cannot be collected, your account returns to the Basic plan automatically. Membership fees for a billing period that has started are non-refundable except where the law requires otherwise. Every membership payment and renewal is recorded in your billing history.",
      "There are no hidden charges, and you only pay when money changes hands or when you choose a paid membership. We will give reasonable advance notice of any change to our fees before it takes effect, and continued use of the Site after that point constitutes acceptance of the updated fees.",
    ],
  },
  {
    heading: "10. Taxes",
    body: [
      "You are solely responsible for determining, collecting, reporting and paying all taxes associated with your use of the Site and the income you earn or payments you make, including income tax, self-employment tax, VAT/GST and any withholding that may apply.",
      "We may ask you to provide tax information (for example, a W-9, W-8BEN or equivalent) and may withhold or report amounts where required by law. Service fees are exclusive of taxes unless stated otherwise. Xwork does not provide tax advice; please consult a qualified professional.",
    ],
  },
  {
    heading: "11. Refunds and cancellations",
    body: [
      "Refunds for fixed-price work are handled through escrow, milestone cancellation, and our dispute process. In general, funds that have not yet been released can be refunded by mutual agreement or through a dispute, while work that has been approved and released is not automatically refundable.",
      "Our full, detailed Refund Policy explains exactly when refunds are available, how to request one, how disputes are mediated, how service fees are treated, and the timelines involved. Please read the Refund Policy, which forms part of these Terms.",
    ],
  },
  {
    heading: "12. Withdrawals and payout methods",
    body: [
      "Freelancers may add a payout method (such as PayPal, Payoneer or a bank account) and withdraw their available balance once their identity is verified. For your security, Xwork stores only a masked reference to a payout method (for example, the last four digits) and never your full account number.",
      "Withdrawals may be subject to minimum amounts, holding periods, verification checks and processing times that vary by method and by the bank or provider involved. Amounts that are subject to an open dispute or security review may be unavailable for withdrawal until the matter is resolved.",
    ],
  },
  {
    heading: "13. Acceptable use and prohibited conduct",
    body: [
      "You agree to use the Site lawfully and in good faith. You must not: post unlawful, fraudulent, infringing, defamatory, discriminatory, hateful, sexually exploitative or misleading content; harass, threaten, impersonate or harm other users; post or solicit work that is illegal or that violates the rights of others; circumvent fees; create fake jobs, proposals, reviews or accounts; or upload malware.",
      "You must not interfere with the security or operation of the Site, attempt to access data you are not authorised to access, or use bots, scrapers or other automated means to collect data or overload our systems. We may remove content and restrict, suspend or close accounts that we reasonably believe break these rules or put other users at risk.",
      "Accessing Xwork through a VPN, proxy or anonymising network is not permitted, because masking your real location undermines the identity and payment protections the marketplace depends on. To keep accounts safe, our systems run automated security checks — for example on the reputation of the network you sign in from, the country on your identity document versus your profile, the email domain you register with, and the number of accounts using one network. Confirmed breaches are recorded as violations on your account (see Section 15) and can lead to immediate suspension.",
    ],
  },
  {
    heading: "14. Keeping communication and payments on Xwork",
    body: [
      "Please keep your conversations and payments on Xwork. Don't share personal contact details (such as email addresses, phone numbers, or external links) or arrange to pay or be paid outside the platform. Keeping everything on Xwork is exactly what lets us protect your payments and step in to help if something goes wrong — it's there for your benefit.",
      "We enforce this with a five-strike policy. If our system detects a message that tries to move contact or payment off Xwork, that message isn't delivered and you'll receive a warning. A red notice showing how many warnings you have appears on your profile, and we email the address linked to your account. After five warnings your account is permanently suspended: a suspension notice appears on your profile and you can no longer send messages or apply to jobs. We'd much rather you stay — so just keep things on Xwork and you'll never see a warning.",
    ],
  },
  {
    heading: "15. Reviews, Job Success Score, badges and account health",
    body: [
      "After a contract ends, clients and freelancers may leave honest ratings and reviews of one another based on their genuine experience. Reviews must be truthful, must not be manipulated, traded or incentivised, and must not contain unlawful or abusive content.",
      "Xwork calculates trust signals from on-platform activity, including a freelancer's Job Success Score (refreshed on a rolling cycle, currently about every 15 days) and talent badges — Rising Talent, Top Rated and Top Rated Plus — awarded and removed automatically against published criteria such as earnings, feedback, activity and account standing. These signals help users make decisions; we do not guarantee their accuracy, they may change as your history changes, and we may adjust how they are calculated over time.",
      "Directing or accepting payment outside our payment system, or repeatedly moving communication off Xwork before a contract is in place, will cost you your talent badge, and you will not be eligible to earn one again for six months, in addition to any other enforcement under these Terms.",
      "Each freelancer account also carries an account-health score, which starts at 100% and is affected only by recorded policy and security violations, upheld client complaints, and poor client reviews — never by profile completeness. Serious or accumulated violations can restrict what an account can do. You can see your score, every violation affecting it, and how to recover on your Account Health page, and you may appeal any violation you believe is mistaken by contacting support.",
    ],
  },
  {
    heading: "16. Intellectual property in the Site",
    body: [
      "The Site, including the Xwork name, logo, design, text, graphics and software, is owned by Xwork or its licensors and is protected by intellectual-property laws. We grant you a limited, personal, non-exclusive, non-transferable and revocable licence to use the Site for its intended purpose.",
      "You may not copy, modify, distribute, sell, reverse-engineer or create derivative works from any part of the Site except as expressly permitted by these Terms or by law.",
    ],
  },
  {
    heading: "17. Work product and ownership",
    body: [
      "Unless the client and freelancer agree otherwise in writing, and subject to full payment, the freelancer assigns to the client the deliverables created specifically for that client under a contract once those deliverables have been fully paid for.",
      "Until full payment is made, ownership of the work product remains with the freelancer. Freelancers retain ownership of pre-existing materials, tools and general know-how, and may grant the client a licence to use those where they are incorporated into a deliverable. Users are responsible for agreeing on ownership, licensing and any third-party materials in their contract.",
    ],
  },
  {
    heading: "18. Confidentiality",
    body: [
      "In the course of a contract you may receive confidential information from the other party. You agree to use such information only to perform the contract, to protect it with reasonable care, and not to disclose it to others except as needed to carry out the work or as required by law.",
    ],
  },
  {
    heading: "19. Non-circumvention and off-platform relationships",
    body: [
      "Relationships that begin on Xwork should stay on Xwork. You agree not to solicit, or accept a solicitation, to take a working relationship that originated on the Site off-platform in order to avoid fees, for a reasonable period after you are introduced through the Site.",
      "We may, at our discretion, offer an optional way to convert a relationship off-platform for a fee where permitted. Circumventing the Site to avoid fees is a serious breach of these Terms and may result in suspension or closure of your account.",
    ],
  },
  {
    heading: "20. Content you post and licence to Xwork",
    body: [
      "You keep ownership of the content you submit to the Site (such as your profile, portfolio, messages, job posts and proposals). By posting content you grant Xwork a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, display and distribute that content as needed to operate, promote and improve the Site.",
      "You are responsible for ensuring you have the rights to everything you post and that it does not infringe anyone else's rights. We may remove content that violates these Terms or the law.",
    ],
  },
  {
    heading: "21. Third-party links and services",
    body: [
      "The Site may link to or integrate with third-party websites, payment providers and services that we do not control. We are not responsible for their content, policies or practices, and your use of them is at your own risk and subject to their terms.",
    ],
  },
  {
    heading: "22. Disputes between users and resolution",
    body: [
      "If a disagreement arises between a client and a freelancer, we encourage you to first try to resolve it directly through Xwork messaging. Where that does not work, either party may raise a dispute on the relevant contract or milestone.",
      "When a dispute is raised, affected escrow funds are held while the matter is reviewed. Both parties may submit information, and Xwork (or a neutral mediator we appoint) will help the parties reach a fair outcome, which may include releasing funds, refunding funds, or splitting them. Decisions made through this process are intended to be final as between the parties for the funds in question. Full details are in our Refund Policy.",
    ],
  },
  {
    heading: "23. Suspension and termination",
    body: [
      "You may stop using the Site and close your account at any time from your settings. Closing your account does not cancel obligations that already exist, such as completing funded work, paying amounts owed, or resolving an open dispute.",
      "We may warn, limit, suspend or permanently close an account that breaches these Terms, that creates risk for other users or for Xwork, or where required by law. Where practical we will give notice and a reason, but we may act immediately in cases of fraud, security risk, or serious harm. Provisions that by their nature should survive termination will continue to apply.",
    ],
  },
  {
    heading: "24. Disclaimers",
    body: [
      "The Site and all content are provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied, to the fullest extent permitted by law, including any implied warranties of merchantability, fitness for a particular purpose and non-infringement.",
      "We do not warrant that the Site will be uninterrupted, secure or error-free, that defects will be corrected, or that any freelancer, client, job, proposal or outcome will meet your expectations. You use the Site, and engage with other users, at your own risk.",
    ],
  },
  {
    heading: "25. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, Xwork and its officers, employees and agents will not be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, data, goodwill or opportunity, arising out of or relating to your use of the Site or any contract between users.",
      "To the fullest extent permitted by law, our total aggregate liability for any claim relating to the Site will not exceed the greater of the total service fees you paid to Xwork in the three months before the event giving rise to the claim, or one hundred US dollars. Nothing in these Terms limits liability that cannot be limited under applicable law.",
    ],
  },
  {
    heading: "26. Indemnification",
    body: [
      "You agree to indemnify and hold harmless Xwork and its officers, employees and agents from and against any claims, damages, losses, liabilities and reasonable expenses (including legal fees) arising out of or related to your use of the Site, your content, the work you perform or commission, your breach of these Terms, or your violation of any law or the rights of a third party.",
    ],
  },
  {
    heading: "27. Dispute resolution with Xwork and governing law",
    body: [
      "If you have a dispute with Xwork, please contact us first through the Help Center so we can try to resolve it informally; most concerns can be settled this way. These Terms are governed by the laws applicable in the place where Xwork operates, without regard to conflict-of-law rules.",
      "Where permitted by law, you and Xwork agree that disputes that cannot be resolved informally will be settled on an individual basis (not as a class action) through the courts or, where applicable, binding arbitration in that place. Nothing here prevents either party from seeking urgent injunctive relief, or limits any rights you have under mandatory local consumer law.",
    ],
  },
  {
    heading: "28. Force majeure",
    body: [
      "Xwork is not responsible for any failure or delay in operating the Site caused by events beyond our reasonable control, including acts of nature, war, terrorism, civil unrest, labour disputes, power or internet failures, or actions of third-party providers.",
    ],
  },
  {
    heading: "29. Assignment, severability and entire agreement",
    body: [
      "You may not assign or transfer these Terms without our prior written consent; we may assign them as part of a merger, acquisition or sale of assets. If any provision is found unenforceable, the rest of the Terms remain in effect and the unenforceable provision will be modified to the minimum extent necessary.",
      "These Terms, together with the User Agreement, Privacy Policy and Refund Policy, are the entire agreement between you and Xwork and supersede any prior agreements on the same subject. Our failure to enforce any provision is not a waiver of it.",
      "These Terms are drafted in English. If we provide a translation, the English version controls in the event of any conflict. Section headings are for convenience only and do not affect interpretation.",
    ],
  },
  {
    heading: "30. Electronic communications and notices",
    body: [
      "By using the Site you consent to receive communications from us electronically — including notices, agreements and disclosures — by email, through the Site, or through in-app notifications, and you agree that these satisfy any legal requirement that such communications be in writing.",
    ],
  },
  {
    heading: "31. Geographic eligibility, sanctions and export controls",
    body: [
      "Xwork is available in many countries, but not everywhere. You may use the Site only where the law permits. You may not use Xwork if you are located in, ordinarily resident in, or accessing it from a country or region subject to comprehensive government or international sanctions, or if you are an individual or entity named on any applicable sanctions or restricted-party list.",
      "You agree to comply with all applicable export-control, trade and sanctions laws, and you represent that you are not barred from using the Site under them. We may block, restrict, suspend or close accounts, and may limit the countries from which the Site can be accessed, to comply with these laws.",
    ],
  },
  {
    heading: "32. Anti-money laundering and compliance checks",
    body: [
      "To keep Xwork lawful and safe, we and our payment and verification partners carry out checks designed to detect and prevent money laundering, terrorist financing, fraud and other financial crime. You agree to provide accurate identity, tax and payment information when asked and to cooperate with reasonable checks.",
      "We may delay, hold, refuse or reverse a transaction, request additional information, or limit or suspend an account where we reasonably suspect a violation of these requirements or applicable law, or where required to comply with a legal obligation.",
    ],
  },
  {
    heading: "33. Worker classification and tax compliance",
    body: [
      "Clients and freelancers transact as independent parties. The client and the freelancer are each solely responsible for determining the correct legal classification of their working relationship under the laws that apply to them (for example, independent contractor versus employee), and for meeting any resulting obligations — including taxes, social contributions, benefits, insurance, work authorisation and licensing.",
      "Xwork does not make, and is not responsible for, any determination about the classification of a working relationship between users, and is not liable for any misclassification or for either party's failure to meet its legal obligations.",
    ],
  },
  {
    heading: "34. No endorsement, vetting or guarantee",
    body: [
      "Xwork does not employ, endorse, recommend or guarantee any client, freelancer, job, proposal, profile or piece of work. Beyond the identity verification we describe, we do not conduct background checks, reference checks, or assessments of skills, qualifications or character, and we do not independently verify everything users post.",
      "You are responsible for your own due diligence before working with another user, and you engage with other users at your own risk.",
    ],
  },
  {
    heading: "35. Copyright and intellectual-property complaints",
    body: [
      "We respect intellectual-property rights and expect users to do the same. If you believe content on the Site infringes your copyright or other rights, please notify us through the Help Center with: a description of the protected work and of the allegedly infringing content and where it is located; your contact details; a statement that you have a good-faith belief the use is not authorised; and a statement, made in good faith, that the information in your notice is accurate.",
      "We will review valid notices and may remove or disable access to the content concerned. Where the law allows, the affected user may submit a counter-notice. We may suspend or close the accounts of users who repeatedly infringe the rights of others.",
    ],
  },
  {
    heading: "36. Feedback",
    body: [
      "If you choose to send us ideas, suggestions or feedback about the Site, you grant Xwork a perpetual, irrevocable, worldwide, royalty-free licence to use them for any purpose without any obligation or payment to you. We're always glad to hear how we can improve.",
    ],
  },
  {
    heading: "37. Changes to these Terms",
    body: [
      "We may update these Terms from time to time. When we make material changes we will post the updated version here and update the date below, and where appropriate we will notify you. Continuing to use the Site after the changes take effect means you accept the updated Terms; if you do not agree, you should stop using the Site and may close your account.",
    ],
  },
  {
    heading: "38. Contact",
    body: [
      "If you have questions about these Terms, you can reach our support team through the Help Center on the Site, or by the contact details published there.",
    ],
  },
];

export default async function TermsPage() {
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
          Xwork Terms of Service
        </h1>
        <p className="text-[10px] text-neutral-500 mt-1">
          Last updated: July 6, 2026
        </p>
        <p className="text-[10px] text-neutral-700 leading-relaxed mt-4">
          These Terms explain the rules for using Xwork. Please also read our{" "}
          <Link href="/user-agreement" className="text-primary underline">
            User Agreement
          </Link>
          , our{" "}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>{" "}
          and our{" "}
          <Link href="/refund-policy" className="text-primary underline">
            Refund Policy
          </Link>
          , which form part of your agreement with us.
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
          By using Xwork, you acknowledge that you have read and agree to these
          Terms of Service.
        </p>
      </div>
    </main>
  );
}
