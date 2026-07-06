import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { OperatorNote } from "@/components/operator-note";

export const metadata = {
  title: "Refund Policy | Xwork",
};

// Original copy — written from scratch, not copied from any other platform.
// Typography per spec: main header 20px, section headings 14px, body 10px.

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Overview and scope",
    body: [
      "This Refund Policy explains how money is held, released, refunded and disputed on Xwork. It applies to all payments made through the Site between clients and freelancers, and it forms part of, and should be read together with, our Terms of Service and User Agreement.",
      "Xwork is a marketplace, not a party to the contracts between clients and freelancers. This policy describes the protections and processes we provide to help both sides transact safely; it does not change the underlying agreement two users make with one another, except where this policy expressly governs the handling of escrow funds.",
      "Because Xwork supports fixed-price contracts, this policy is written around fixed-price escrow and milestones. If we introduce other payment models in future, we will update this policy accordingly.",
    ],
  },
  {
    heading: "2. Definitions",
    body: [
      "\"Client\" means a user who funds and pays for work. \"Freelancer\" means a user who performs work and receives payment. \"Contract\" means the fixed-price agreement formed between a client and a freelancer on the Site.",
      "\"Milestone\" means a defined portion of a contract with its own deliverable and price. \"Escrow\" means funds the client deposits with Xwork and that are reserved for a milestone but not yet released. \"Service fee\" means the fee Xwork charges (2% to clients, 10% to freelancers). \"Release\" means moving escrow funds to the freelancer's available balance.",
    ],
  },
  {
    heading: "3. How fixed-price payments work",
    body: [
      "On a fixed-price contract, the client funds each milestone into escrow before the freelancer begins that milestone. The money leaves the client's payment method and is held securely by Xwork; it has not yet been paid to the freelancer.",
      "Holding funds in escrow protects both sides: the freelancer can see that the money is secured before starting, and the client knows the funds will only be released for work they approve. No freelancer is paid from escrow until the relevant milestone is approved or released under this policy.",
    ],
  },
  {
    heading: "4. When funds are released to the freelancer",
    body: [
      "Funds are released from escrow to the freelancer when the client reviews the submitted work and approves the milestone. Once approved, the amount (less the freelancer service fee) moves to the freelancer's available balance and is no longer refundable through the normal escrow process.",
      "To prevent funded work from being held indefinitely, an approval may also occur automatically after a review window if the client neither approves nor raises a dispute within that period. We will make the review window clear at the point of submission. Auto-approved funds are treated the same as manually approved funds.",
    ],
  },
  {
    heading: "5. Your right to a refund",
    body: [
      "A client may receive a refund of escrow funds that have not yet been released, either by mutual agreement with the freelancer or through the Xwork dispute process described below. Refunds are returned to the original payment method used to fund the escrow, less any non-refundable amounts described in this policy.",
      "Funds that have already been approved and released to a freelancer are not automatically refundable. A client who is unhappy with delivered and paid-for work should first contact the freelancer, and may raise a dispute where there is a genuine breach of the agreement.",
    ],
  },
  {
    heading: "6. Situations that are generally eligible for a refund",
    body: [
      "Refunds of unreleased escrow are generally available where: the freelancer did not start or deliver the agreed work; the delivered work materially fails to match what was agreed in the contract; the milestone was funded in error or duplicated; the work was never required because the contract was cancelled before it began; or both parties agree to cancel a milestone and return the funds.",
      "Refunds may also be appropriate where work was obtained through fraud, misrepresentation or a clear violation of our Terms, in which case Xwork may step in directly.",
    ],
  },
  {
    heading: "7. Situations that are generally not eligible for a refund",
    body: [
      "Refunds are generally not available where: the client has already approved the milestone and the funds have been released; the deliverable substantially matches what was agreed and the client has simply changed their mind; the request relates to work, contact or payments arranged off the Site in breach of our Terms; or the request is an attempt to obtain completed work without paying for it.",
      "Dissatisfaction that does not amount to a breach of the agreement is normally resolved through revisions agreed with the freelancer rather than a refund. Service fees may be non-refundable as described in Section 12.",
    ],
  },
  {
    heading: "8. How to request a refund",
    body: [
      "Step 1 — Talk to the freelancer first. Most issues are resolved quickly by messaging the freelancer and agreeing on a revision, a partial refund, or cancelling an unstarted milestone. Keep this conversation on Xwork.",
      "Step 2 — Request a refund or cancellation on the milestone. If you cannot resolve it directly, use the contract tools to request that the freelancer refund or cancel the relevant milestone. The freelancer can approve the refund, which returns the unreleased funds to you.",
      "Step 3 — Open a dispute. If the freelancer does not agree, you may open a dispute on the contract. The affected escrow funds are then held while Xwork reviews the matter.",
    ],
  },
  {
    heading: "9. Mutual refunds and cancellations",
    body: [
      "At any time before funds are released, a client and freelancer may agree between themselves to cancel a milestone or contract and return some or all of the escrow to the client. Mutual cancellations are the fastest way to resolve an issue and do not require Xwork to intervene.",
      "Where only part of the work was completed, the parties are encouraged to agree a fair split — for example, releasing part of the milestone to the freelancer for work done and refunding the remainder to the client.",
    ],
  },
  {
    heading: "10. Disputes and mediation",
    body: [
      "If the parties cannot agree, either side may raise a dispute. When a dispute is opened, the contract is marked as disputed and the affected escrow funds are held and cannot be withdrawn until the dispute is resolved.",
      "Both the client and the freelancer may submit their account of what happened and supporting evidence (such as messages, files and the agreed scope). Xwork, or a neutral mediator we appoint, will review the information and help the parties reach a fair outcome. We act impartially; we are not an advocate for either side.",
      "The outcome may be a full refund to the client, a full release to the freelancer, or a partial split that reflects the work actually completed. Decisions reached through this process are intended to be final between the parties as to the disputed funds. Where the parties prefer, a dispute may proceed to binding arbitration as described in our Terms.",
    ],
  },
  {
    heading: "11. Refund decisions and outcomes",
    body: [
      "When a refund is approved — by the freelancer, by mutual agreement, or through a dispute — the unreleased escrow amount due to the client is returned to the original payment method. Any amount due to the freelancer for completed work is released to their balance at the same time.",
      "We will record the outcome on the contract and notify both parties. If new, material evidence comes to light after a decision, you may contact support, but resolved disputes are generally not reopened.",
    ],
  },
  {
    heading: "12. Service fees and refunds",
    body: [
      "When escrow is refunded to a client before release, the client service fee associated with the refunded amount is also returned, so a fully refunded, never-released milestone leaves the client no worse off on fees.",
      "Once funds have been released to a freelancer, the freelancer service fee already deducted is generally non-refundable, because the service of facilitating that completed transaction has been provided. Where a partial refund is agreed after release, fees are adjusted in proportion to the amount that is genuinely returned, at our reasonable discretion.",
    ],
  },
  {
    heading: "13. Refund timelines and methods",
    body: [
      "Once a refund is approved, Xwork processes it back to the original payment method promptly. The time for the money to appear depends on your bank or payment provider and is outside our control; card and bank refunds commonly take several business days, and in some cases up to a couple of weeks.",
      "Refunds are issued to the original payment method used to fund the escrow. We do not issue refunds to a different person, card or account, except where required by law or where the original method is no longer available and we can verify an alternative.",
    ],
  },
  {
    heading: "14. Partial refunds",
    body: [
      "Many disagreements are best resolved with a partial refund that reflects the work actually delivered. A partial refund returns part of the escrow to the client and releases the rest to the freelancer. Partial refunds can be agreed directly between the parties or determined through the dispute process.",
    ],
  },
  {
    heading: "15. Withdrawals and reversals",
    body: [
      "Once funds have been released and the freelancer has withdrawn them to an external payout method, they have left the Xwork escrow system and cannot be reversed by us. For this reason, clients should review and approve work carefully, and raise any concerns before approving a milestone.",
      "If a refund is later owed after funds have been withdrawn — for example, because of fraud or a chargeback — the amount becomes a debt owed by the responsible user, which we may recover from their balance, future earnings, or by other lawful means.",
    ],
  },
  {
    heading: "16. Chargebacks",
    body: [
      "If you have a payment concern, please use Xwork's refund and dispute process rather than asking your bank or card issuer for a chargeback. Our process is usually faster and is designed for marketplace transactions.",
      "Initiating a chargeback instead of using our process — particularly for work that was delivered and approved — may be treated as a breach of our Terms and can result in holds, recovery of the disputed amount, and suspension or closure of your account. We cooperate with payment providers to contest chargebacks that are not legitimate.",
    ],
  },
  {
    heading: "17. Fraud, abuse and policy violations",
    body: [
      "We do not provide refunds as a way to reward abuse of the platform. Where a transaction or refund request involves fraud, collusion, fee circumvention, off-platform dealing, fake work or reviews, or other violations of our Terms, we may withhold or reverse funds, refuse a refund, and take action on the accounts involved.",
      "Equally, we will act to protect users who have been defrauded, including refunding affected escrow where appropriate and reporting serious matters to the relevant authorities.",
    ],
  },
  {
    heading: "18. Currency and conversion",
    body: [
      "Amounts on Xwork are handled in the currency shown at the time of the transaction. If your payment method uses a different currency, your bank or provider may apply its own conversion rate and fees when funding or refunding. Differences caused by exchange-rate movement between funding and refund are not the responsibility of Xwork.",
    ],
  },
  {
    heading: "19. Account closure and remaining balances",
    body: [
      "Closing your account does not cancel obligations that already exist, including completing funded work, paying amounts owed, or resolving an open dispute. Escrow funds tied to an open contract or dispute are handled under this policy before any balance is settled.",
      "If you have an available balance when you close your account, you may withdraw it through your verified payout method, subject to any holds, verification or legal requirements.",
    ],
  },
  {
    heading: "20. Optional purchases",
    body: [
      "Applying to jobs on Xwork is free, and we do not charge credits or \"connects\" to submit proposals. If we offer any optional paid features in future (for example, promotion of a proposal), the refund terms for those features will be stated at the point of purchase and, unless stated otherwise, such optional purchases are non-refundable once used.",
    ],
  },
  {
    heading: "21. Changes to this policy",
    body: [
      "We may update this Refund Policy from time to time. When we make material changes we will post the updated version here and update the date below. Changes apply to transactions that take place after the update; they do not retroactively change the treatment of a payment already made.",
    ],
  },
  {
    heading: "22. Contact and help",
    body: [
      "If you have a question about a refund, a release, or a dispute, the fastest path is the contract itself and the Xwork messaging and dispute tools. For anything our self-service tools can't resolve, reach our support team through the Help Center on the Site and a person will assist you.",
    ],
  },
];

export default async function RefundPolicyPage() {
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
          Xwork Refund Policy
        </h1>
        <p className="text-[10px] text-neutral-500 mt-1">
          Last updated: July 6, 2026
        </p>
        <p className="text-[10px] text-neutral-700 leading-relaxed mt-4">
          This Refund Policy explains how payments are protected, released,
          refunded and disputed on Xwork. It forms part of, and should be read
          with, our{" "}
          <Link href="/terms" className="text-primary underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/user-agreement" className="text-primary underline">
            User Agreement
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
          By using Xwork, you acknowledge that you have read and agree to this
          Refund Policy.
        </p>
      </div>
    </main>
  );
}
