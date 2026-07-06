// Built-in Help Center answerer. Works with ZERO configuration — no API key,
// no external calls. It matches the user's question against Xwork's own
// knowledge and returns a real answer. When a real Anthropic API key is set
// (ANTHROPIC_API_KEY), the route uses the full AI model instead and this is
// the offline fallback. Keeps the assistant genuinely useful out of the box.

type Entry = {
  // Any of these phrases (lowercased, substring match) triggers this answer.
  keywords: string[];
  answer: string;
};

const KB: Entry[] = [
  {
    // Client-side questions are deflected — the freelancer assistant never
    // reveals client fees, requirements, or how the client side works.
    keywords: [
      "client fee",
      "clients pay",
      "how much do clients pay",
      "client charge",
      "client cost",
      "cost for client",
      "charge the client",
      "client side",
      "what do clients pay",
      "client pay",
      "hiring fee",
    ],
    answer:
      "That's handled on the client's side and isn't part of your freelancer account, so I can't go into it here. What matters for you: applying is free, and your service fee is 10% (or 5% on Pro), shown clearly before anything is deducted.",
  },
  {
    keywords: ["withdraw", "cash out", "get my money", "payout", "take out money"],
    answer:
      "To withdraw your earnings: first verify your identity (Settings → Identity) and complete your tax info, then go to the Withdrawals page and add a withdrawal method — a Local Bank in your country, or Payoneer. New methods activate after a 3-day security period. Once your balance is available, click “Withdraw now”, choose the method and amount, confirm with your password, and it’s on its way.",
  },
  {
    keywords: ["fee", "commission", "charge", "how much do you take", "percent"],
    answer:
      "Applying to jobs is free. When you get paid, your service fee is 10% on the free Basic plan, or 5% with Pro membership ($20/month). It's shown clearly in your earnings before anything is deducted.",
  },
  {
    keywords: ["connect", "credit", "cost to apply", "pay to apply"],
    answer:
      "Applying is completely free on Xwork — there are no “connects” or credits to buy. Each job accepts the first 50 proposals, so applying early helps.",
  },
  {
    keywords: ["apply", "proposal", "bid", "submit proposal", "how to apply"],
    answer:
      "Open a job from your feed and click “Apply now”. Write a short cover letter, set your bid (a single price or milestones), and submit — it’s free. You can edit or withdraw a proposal from the proposal page while it’s still pending.",
  },
  {
    keywords: ["pending", "why pending", "still pending", "status pending"],
    answer:
      "“Pending” just means you’ve applied and the client hasn’t responded yet. It’s the normal waiting state — once the client shortlists, hires, or declines you, the status updates automatically. There’s nothing you need to do.",
  },
  {
    keywords: ["edit proposal", "change proposal", "change my bid", "update proposal"],
    answer:
      "Yes — open the proposal from your proposals hub and click “Edit proposal”. You can change your cover letter, bid, duration, and milestones while the proposal is still pending. Once you’re hired or the client declines, editing closes.",
  },
  {
    keywords: ["verify", "identity", "id verification", "verify my identity", "kyc"],
    answer:
      "Go to Settings → Identity verification. You’ll upload a government ID and take a selfie — it’s a one-time check. Usually it’s instant; if automatic face-matching can’t run, a person reviews your documents (normally within 24 hours) and you’ll get a notification when it’s done.",
  },
  {
    keywords: ["phone", "verify phone", "phone number", "otp", "verify number"],
    answer:
      "Add your phone number in Settings → Contact info, then click “Verify this number”. You’ll get a 6-digit code — enter it to confirm. If you change your number later, you’ll need to verify the new one.",
  },
  {
    keywords: ["escrow", "milestone", "how do i get paid", "when do i get paid", "payment protected"],
    answer:
      "Xwork uses fixed-price contracts with milestones. The client funds a milestone into escrow before you start, so you can see the money is secured. When you submit the work and the client approves it, the amount (minus the fee) is released to your available balance.",
  },
  {
    keywords: ["dispute", "disagreement", "problem with client", "client won't pay", "raise dispute"],
    answer:
      "If something goes wrong on a contract, open it and choose to raise a dispute. Any escrow that hasn’t been released is held while both sides share their side, and our team helps reach a fair outcome. Raising a dispute also opens a request our team can follow.",
  },
  {
    keywords: ["refund", "money back", "return payment", "request refund"],
    answer:
      "On a contract you can request a refund — either side can start one, and the other reviews it. If a contract is ended while money is still in escrow, that escrow is returned to the client. You’ll find “Request a refund” in the contract’s menu.",
  },
  {
    keywords: ["pro", "membership", "upgrade", "5%", "premium"],
    answer:
      "Pro membership is $20/month. It lowers your service fee from 10% to 5%, and adds bid-range visibility, job alerts, proposal insights, a custom profile URL, an always-active profile, and a Pro badge. You can manage it in Settings → Membership and cancel any time.",
  },
  {
    keywords: ["contract", "hired", "start work", "view contract"],
    answer:
      "When a client hires you, a contract opens with your milestones. You’ll find it under Deliver work → Active contracts. Submit work on each milestone there; once the client approves, you’re paid to your balance.",
  },
  {
    keywords: ["download", "my data", "export", "data export"],
    answer:
      "You can download everything Xwork stores about you from Settings → Contact info → “Download my data”. It gives you a single file with your profile, proposals, contracts, payments, withdrawals, reviews and more.",
  },
  {
    keywords: ["badge", "job success", "jss", "top rated", "rising talent"],
    answer:
      "Your Job Success Score and talent badges (Rising Talent, Top Rated, Top Rated Plus) come from real completed contracts and client feedback. Keep communication and work on Xwork, deliver great work, and they build up automatically over time.",
  },
  {
    keywords: ["off platform", "outside", "whatsapp", "email address", "share contact", "pay outside"],
    answer:
      "Please keep all conversations and payments on Xwork — it’s what lets us protect your payments and step in if something goes wrong. Sharing contact details or arranging payment outside the platform is blocked, and repeated attempts can suspend your account.",
  },
];

// Phrases that mean "I want a human / to open a ticket / report something".
const TICKET_INTENT = [
  "talk to a human",
  "talk to someone",
  "human",
  "agent",
  "support team",
  "open a ticket",
  "raise a ticket",
  "contact support",
  "report a problem",
  "report a bug",
  "complaint",
  "report",
  "file a ticket",
  "speak to",
];

export type HelpBotResult = { reply: string; offerTicket?: boolean };

// Returns a helpful answer for the user's latest message, and whether we
// should also offer to open a support ticket.
export function localHelpAnswer(message: string): HelpBotResult {
  const text = (message || "").toLowerCase();

  if (TICKET_INTENT.some((p) => text.includes(p))) {
    return {
      reply:
        "Of course — I'll get a real person from our team on this for you. Take a quick look at the details below, tweak anything you'd like, and hit submit. We usually reply within 1 business day. 🙂",
      offerTicket: true,
    };
  }

  let best: Entry | null = null;
  let bestScore = 0;
  for (const entry of KB) {
    const score = entry.keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best) {
    return {
      reply:
        best.answer +
        "\n\nHope that helps! If it doesn’t quite cover it, just say “open a ticket” and I’ll pull in our team for you.",
    };
  }

  return {
    reply:
      "Hmm, I’m not totally sure about that one — I don’t want to guess. Try rephrasing it, browse the help topics below, or just say “open a ticket” and I’ll get a real person from our team to help you out.",
    offerTicket: true,
  };
}
