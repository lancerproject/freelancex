// Help Center content for Xwork. Categories + articles, written in plain,
// friendly language and matched to Xwork's model (fixed-price, 2%/10% fees,
// freelancer-only identity verification, Google sign-in).

export type HelpArticle = {
  slug: string;
  title: string;
  category: string;
  body: string[];
};

export type HelpCategory = {
  key: string;
  title: string;
  desc: string;
};

export const HELP_CATEGORIES: HelpCategory[] = [
  { key: "getting-started", title: "Getting started", desc: "Create an account and find your way around Xwork." },
  { key: "account", title: "Account & profile", desc: "Manage your login, profile, and settings." },
  { key: "hiring", title: "Hiring & posting jobs", desc: "For clients: post jobs, review proposals, and hire." },
  { key: "finding-work", title: "Finding work & proposals", desc: "For freelancers: find jobs and send proposals." },
  { key: "payments", title: "Payments & fees", desc: "How payments, milestones, and service fees work." },
  { key: "trust-safety", title: "Trust, safety & disputes", desc: "Staying safe and resolving issues." },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // Getting started
  {
    slug: "create-an-account",
    title: "How do I create an account?",
    category: "getting-started",
    body: [
      "Click Sign up at the top of any page, then choose whether you're a client (you want to hire) or a freelancer (you want to work).",
      "Fill in your name, email, password, and country, or use Continue with Google to sign up in one click. That's it — you're in.",
      "Clients and freelancers use separate accounts. If you want to do both, you can create a freelancer account separately.",
    ],
  },
  {
    slug: "client-vs-freelancer",
    title: "What's the difference between a client and a freelancer account?",
    category: "getting-started",
    body: [
      "A client account is for posting jobs and hiring. A freelancer account is for finding work and getting paid.",
      "They're kept separate so each experience stays simple. You can have one of each using different sign-ups.",
    ],
  },
  {
    slug: "is-it-free-to-join",
    title: "Is it free to join Xwork?",
    category: "getting-started",
    body: [
      "Yes. Creating an account and posting fixed-price jobs is completely free. You only pay a small service fee when money changes hands.",
    ],
  },

  // Account & profile
  {
    slug: "change-name-email",
    title: "How do I change my name or email?",
    category: "account",
    body: [
      "Go to Settings → Account. You can update your name there. To change your email, enter a new one and we'll send a verification link to confirm it.",
      "Freelancers: name changes may be limited to protect your work history and reviews.",
    ],
  },
  {
    slug: "reset-password",
    title: "I forgot my password. How do I reset it?",
    category: "account",
    body: [
      "On the login page, enter your email and click Forgot password. We'll email you a link to set a new one.",
      "If you signed up with Google, just use Continue with Google instead of a password.",
    ],
  },
  {
    slug: "close-account",
    title: "How do I close my account?",
    category: "account",
    body: [
      "Go to Settings and choose Close account. For your security we'll email you a one-time code to confirm.",
      "There's no penalty and no lock-in — you can close your account whenever you like.",
    ],
  },

  // Hiring & posting jobs
  {
    slug: "post-a-job",
    title: "How do I post a job?",
    category: "hiring",
    body: [
      "Click Post a new job and follow the steps: add a title and category, choose the skills you need, set your budget, and describe the work.",
      "All jobs on Xwork are fixed-price. When you're ready, post it for free — or save it as a draft to finish later.",
    ],
  },
  {
    slug: "review-proposals",
    title: "How do I review proposals and hire?",
    category: "hiring",
    body: [
      "Open your job post and go to View proposals. Compare freelancers by their proposal, profile, ratings, and work history.",
      "When you find the right person, send an offer with milestones. Once they accept, you can start working together.",
    ],
  },
  {
    slug: "do-clients-need-verification",
    title: "Do clients need to verify their identity?",
    category: "hiring",
    body: [
      "No. Clients don't need identity verification to post jobs and hire. We keep the hiring side simple.",
      "Freelancers complete a one-time identity check so they can get paid securely.",
    ],
  },

  // Finding work & proposals
  {
    slug: "find-jobs",
    title: "How do I find jobs as a freelancer?",
    category: "finding-work",
    body: [
      "Browse available fixed-price jobs that match your skills and send a proposal explaining how you'd approach the work and your price.",
      "A complete profile with a strong portfolio helps clients choose you.",
    ],
  },
  {
    slug: "get-paid",
    title: "How and when do I get paid?",
    category: "finding-work",
    body: [
      "You're paid for fixed-price work as each milestone is approved by the client. Funds are released to you once the work is accepted.",
      "Freelancers complete a one-time identity verification so payments can be sent securely.",
    ],
  },

  // Payments & fees
  {
    slug: "service-fees",
    title: "What are Xwork's service fees?",
    category: "payments",
    body: [
      "Clients pay a flat 2% service fee and freelancers pay a 10% service fee. There are no hidden charges, no contract initiation fees, and no cost to get started.",
      "You only ever pay a fee when money actually changes hands.",
    ],
  },
  {
    slug: "how-milestones-work",
    title: "How do milestone payments work?",
    category: "payments",
    body: [
      "Fixed-price contracts are split into milestones. The client funds a milestone, the freelancer does the work, and the payment is released when the client approves it.",
      "This protects both sides: clients only pay for approved work, and freelancers know the funds are set aside.",
    ],
  },
  {
    slug: "payment-methods",
    title: "What payment methods can I use?",
    category: "payments",
    body: [
      "You can pay with major credit and debit cards. Available options may vary by location and are shown at checkout.",
    ],
  },

  // Trust, safety & disputes
  {
    slug: "stay-safe",
    title: "How do I stay safe on Xwork?",
    category: "trust-safety",
    body: [
      "Keep your conversations, files, and payments on Xwork. Paying or working off-platform removes the protections we provide.",
      "If something feels off, report it through Help & support and we'll look into it.",
    ],
  },
  {
    slug: "disputes",
    title: "What happens if there's a dispute?",
    category: "trust-safety",
    body: [
      "If a client and freelancer disagree about work or payment, our dispute process helps you reach a fair outcome.",
      "We're here to help both sides — start by messaging the other person, and reach out to support if you need a hand.",
    ],
  },
  {
    slug: "report-a-problem",
    title: "How do I report a problem or a user?",
    category: "trust-safety",
    body: [
      "Use Help & support to report anything that breaks our community guidelines or feels unsafe. We review reports quickly and keep them confidential.",
    ],
  },
];
