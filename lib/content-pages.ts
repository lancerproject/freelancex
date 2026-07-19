// Content for the public info / legal / resource pages linked from the footer.
// Plain language, user-friendly — intentionally not heavy or strict.

export type ContentSection = { heading: string; body: string[] };
export type ContentPage = {
  title: string;
  subtitle?: string;
  sections: ContentSection[];
};

export const CONTENT_PAGES: Record<string, ContentPage> = {
  // ---------------- Legal ----------------
  legal: {
    title: "Legal Center",
    subtitle: "Every Xwork policy in one place.",
    sections: [
      {
        heading: "Agreements",
        body: [
          "Terms of Service (xwork.com/terms) — the core agreement for using Xwork.",
          "User Agreement (xwork.com/user-agreement) — how clients and freelancers work together on the platform.",
          "Acceptable Use Policy (xwork.com/acceptable-use) — what's allowed on Xwork and what isn't.",
        ],
      },
      {
        heading: "Money",
        body: [
          "Refund Policy (xwork.com/refund-policy) — how refunds and escrow protection work.",
        ],
      },
      {
        heading: "Privacy",
        body: [
          "Privacy Policy (xwork.com/privacy) — what we collect and how we use it.",
          "Cookie Policy (xwork.com/cookie-policy) — the cookies we set and why.",
          "CA Notice at Collection (xwork.com/ca-notice) — for California residents.",
          "Your Privacy Choices (xwork.com/your-privacy-choices) — control over your data.",
        ],
      },
      {
        heading: "Questions?",
        body: [
          "If anything in a policy is unclear, open a support request from the Help menu — we're happy to explain it in plain language.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    subtitle:
      "The agreement between you and Xwork. Please read it — using Xwork means you accept it. Last updated July 2026.",
    sections: [
      {
        heading: "1. Introduction and acceptance",
        body: [
          "Welcome to Xwork. These Terms of Service (the “Terms”) are a legal agreement between you and Xwork (“Xwork”, “we”, “us”) governing your access to and use of the Xwork website, apps and services (together, the “Platform”). They work together with our User Agreement, Privacy Policy and Acceptable Use Policy, which are part of these Terms by reference.",
          "By creating an account, or by accessing or using the Platform, you confirm that you have read, understood and agree to be bound by these Terms. If you do not agree, please do not use Xwork. If you use the Platform on behalf of a company or other organisation, you confirm that you are authorised to accept these Terms on its behalf.",
        ],
      },
      {
        heading: "2. Definitions",
        body: [
          "“Client” means a user who posts jobs and hires freelancers. “Freelancer” means a user who offers services and applies to jobs. “User” means anyone with an Xwork account. “Contract” means an agreement between a Client and a Freelancer for services arranged through the Platform. “Content” means anything you post, upload or send through Xwork.",
        ],
      },
      {
        heading: "3. Who can use Xwork",
        body: [
          "You must be at least 18 years old and able to form a binding contract to use Xwork. You may join as a Client, a Freelancer, or both. You agree to provide accurate, current and complete information and to keep it up to date.",
          "One person or organisation may hold only the accounts we permit, and identity verification (where required) must reflect the real person or entity behind the account. Creating accounts to evade a suspension, or impersonating anyone, is not allowed.",
        ],
      },
      {
        heading: "4. Your account and security",
        body: [
          "You are responsible for keeping your login credentials confidential and for all activity that happens under your account. Tell us immediately if you suspect unauthorised use. We offer tools such as two-step verification and the ability to sign out of other devices — we strongly encourage you to use them.",
          "You may not share, sell or transfer your account to anyone else without our written consent.",
        ],
      },
      {
        heading: "5. Xwork's role — we are a marketplace, not a party to your Contracts",
        body: [
          "Xwork provides a venue where Clients and Freelancers can find each other, agree terms, communicate, and pay or get paid. We are not an employer, agency, or party to any Contract between users, and we do not supervise, direct, or control a Freelancer's work.",
          "Clients and Freelancers are solely responsible for the Contracts they enter into, including scope, quality, timelines, and their own legal, tax and regulatory obligations. Any dispute about the work itself is between the Client and the Freelancer, although we provide dispute-resolution tools to help (see section 9).",
        ],
      },
      {
        heading: "6. Posting jobs, proposals and Contracts",
        body: [
          "Clients may post fixed-price jobs at no charge and set the budget, scope and any screening questions. Freelancers may submit proposals and, if selected, receive an offer that becomes a Contract once accepted.",
          "Everything you post must be accurate, lawful and your own to share. Job posts and proposals must describe real work and real intentions. We may remove Content, or decline to show a job or proposal, if it breaks these Terms or our Acceptable Use Policy.",
        ],
      },
      {
        heading: "7. Payments, escrow and fees",
        body: [
          "Fixed-price work on Xwork is funded into escrow and released as milestones are approved, so Freelancers know the money is set aside and Clients only release it for accepted work. Where a milestone is not actively approved, our published auto-approval, hold and cancellation windows apply.",
          "Freelancers pay a service fee on what they earn: 10% on the standard plan, or 5% with a Pro membership. The fee is deducted from the Freelancer's earnings at the time a payment is processed. Clients can post jobs and hire without a platform fee; any payment-processing charges, where they apply, are shown to you before you confirm a payment.",
          "You agree not to take payments, or arrange to be paid, outside the Platform in order to avoid fees or escrow protection. Doing so removes your protections and may lead to account action.",
        ],
      },
      {
        heading: "8. Taxes",
        body: [
          "You are responsible for determining and paying any taxes that apply to your earnings or purchases, and for any tax reporting required where you live or do business. Xwork is not responsible for your tax obligations. Amounts shown on the Platform are exclusive of taxes unless we say otherwise.",
        ],
      },
      {
        heading: "9. Refunds and disputes",
        body: [
          "If something goes wrong on a Contract, Clients and Freelancers should first try to resolve it directly through Messages. Where that isn't possible, either party can open a dispute and our team will review the available evidence and the escrow record to help reach a fair outcome.",
          "Refunds, releases and reversals are handled according to the state of the milestone and our dispute process. Our decisions on platform disputes are made in good faith to keep the marketplace fair, but they do not replace any legal rights the parties may have against each other.",
        ],
      },
      {
        heading: "10. Acceptable use and prohibited conduct",
        body: [
          "You agree to follow our Acceptable Use Policy. In short: don't post anything illegal, deceptive, infringing, hateful or harmful; don't spam, scrape, or interfere with the Platform's operation; don't circumvent fees or escrow; don't harass other users; and don't misuse identity verification or reviews.",
          "We use automated and human review to keep Xwork safe. Sharing off-platform contact or payment details to move work off Xwork, and other attempts to bypass these Terms, may trigger warnings, feature limits, suspension or permanent account closure.",
        ],
      },
      {
        heading: "11. Content and intellectual property",
        body: [
          "You keep ownership of the Content you create. By posting Content on Xwork you grant us a non-exclusive, worldwide, royalty-free licence to host, display and use it as needed to operate and promote the Platform.",
          "Ownership of work delivered under a Contract is determined by the agreement between the Client and the Freelancer. Only deliver work you have the right to provide, and honour the licensing and ownership terms you agree with the other party. The Xwork name, logo and site design are our property and may not be copied or used without permission.",
        ],
      },
      {
        heading: "12. Confidentiality and privacy",
        body: [
          "Handle any confidential information or personal data another user entrusts to you responsibly, only for the purpose of your Contract, and in line with applicable data-protection law. Our own handling of your information is described in the Privacy Policy.",
        ],
      },
      {
        heading: "13. Identity verification and trust",
        body: [
          "To keep the marketplace safe and to enable secure payouts, we may ask you to verify your identity and to provide accurate location and contact details. Providing false verification information, or documents that are not your own, is a serious violation and may result in permanent account closure.",
        ],
      },
      {
        heading: "14. Suspension and termination",
        body: [
          "You can close your account at any time from your settings — there is no penalty and no lock-in, though you remain responsible for obligations already incurred (such as active Contracts and amounts owed).",
          "We may suspend or terminate access if you breach these Terms, create risk for other users or the Platform, or where required by law. Where it is reasonable and lawful to do so, we'll aim to give you notice and a way to resolve the issue.",
        ],
      },
      {
        heading: "15. Disclaimers",
        body: [
          "The Platform is provided “as is” and “as available”. We do not guarantee that any Client will hire, that any Freelancer will deliver, or that the Platform will always be uninterrupted or error-free. We do not endorse any user and are not responsible for the conduct, quality, or output of any Client or Freelancer.",
        ],
      },
      {
        heading: "16. Limitation of liability",
        body: [
          "To the fullest extent permitted by law, Xwork is not liable for any indirect, incidental, special or consequential losses, or for lost profits, data or opportunities, arising from your use of the Platform or from any Contract between users. Nothing in these Terms limits liability that cannot be limited by law.",
        ],
      },
      {
        heading: "17. Indemnification",
        body: [
          "You agree to indemnify and hold Xwork harmless from claims, losses and expenses arising out of your Content, your use of the Platform, your Contracts with other users, or your breach of these Terms or of any law or third-party right.",
        ],
      },
      {
        heading: "18. Governing law and dispute resolution",
        body: [
          "These Terms are governed by the laws applicable where Xwork operates, without regard to conflict-of-laws rules. Disputes between you and Xwork should first be raised with our support team so we can try to resolve them informally. Where a formal process is needed, it will follow the mechanism described at sign-up or otherwise required by applicable law.",
        ],
      },
      {
        heading: "19. Changes to these Terms",
        body: [
          "We may update these Terms from time to time. When we make material changes we'll take reasonable steps to let you know, for example by notice on the Platform or by email. Continuing to use Xwork after an update means you accept the revised Terms.",
        ],
      },
      {
        heading: "20. Contact",
        body: [
          "Questions about these Terms? Reach us any time through the Help Center or our Contact page and we'll be glad to help.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How we handle your information. Last updated June 2026.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "We collect the information you give us — like your name, email, profile details, and the jobs or proposals you create. We also collect basic technical data to keep the site running.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "We use your information to run the marketplace: showing your profile, matching jobs and freelancers, processing payments, and keeping accounts secure. We don't sell your personal data.",
        ],
      },
      {
        heading: "What you control",
        body: [
          "You can view and edit most of your information in your settings at any time, and you can close your account whenever you like.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use only the cookies needed to keep you logged in and to make the site work. We keep this light.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Questions about your data? Reach out through our Contact page and we'll help.",
        ],
      },
    ],
  },
  "trust-safety": {
    title: "Trust, safety & security",
    subtitle: "How we help keep Xwork a safe place to work and hire.",
    sections: [
      {
        heading: "Verified freelancers",
        body: [
          "Freelancers complete a one-time identity check so they can get paid securely. Clients don't need to verify their identity to post jobs and hire — we keep it simple on the hiring side.",
        ],
      },
      {
        heading: "Protected payments",
        body: [
          "Payments for fixed-price work are held securely and released as milestones are approved, so both sides are protected. Clients only pay for work they approve.",
        ],
      },
      {
        heading: "Reviews you can trust",
        body: [
          "Ratings and reviews come from real completed contracts, so you can see genuine work history before you hire or apply.",
        ],
      },
      {
        heading: "Dispute resolution",
        body: [
          "If something goes wrong, our dispute process helps clients and freelancers reach a fair outcome. We're here to help, not to punish.",
        ],
      },
      {
        heading: "Reporting",
        body: [
          "See something that doesn't feel right? Let us know through Help & support and we'll look into it quickly.",
        ],
      },
    ],
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    subtitle: "What's allowed — and what isn't — on Xwork. Part of our Terms of Service.",
    sections: [
      {
        heading: "Overview",
        body: [
          "This Acceptable Use Policy sets out the rules everyone agrees to follow on Xwork. It works alongside our Terms of Service and User Agreement, and breaking it can lead to content removal, warnings, suspension or permanent closure of your account. The simple version: be honest, be respectful, follow the law, and keep your work, communication and payments on Xwork.",
        ],
      },
      {
        heading: "Be honest and act in good faith",
        body: [
          "Describe yourself, your business and your work truthfully. Don't impersonate anyone, misrepresent your skills or experience, post fake jobs or proposals, or create fake or duplicate accounts. Reviews must reflect real, completed contracts and must not be bought, sold, traded or coerced.",
        ],
      },
      {
        heading: "Prohibited content",
        body: [
          "Do not post, send or request content that is illegal, fraudulent, or that infringes someone else's intellectual property or privacy. This includes hateful, harassing, defamatory or discriminatory material; sexually explicit or exploitative content; violent or graphic content; malware or harmful code; and content that promotes illegal goods, services or activity.",
          "Do not post another person's private or personal information without permission, and do not use Xwork to collect or harvest information about other users.",
        ],
      },
      {
        heading: "Prohibited conduct",
        body: [
          "Do not harass, threaten, bully, deceive or discriminate against other users or our staff. Do not use Xwork to recruit for, advertise, or promote anything unrelated to the work at hand, to run multi-level or pyramid schemes, or to solicit work that is illegal where it will be performed.",
          "Do not post jobs or proposals designed to extract free work, samples or information with no genuine intent to hire or be hired.",
        ],
      },
      {
        heading: "No fraud, scams or payment abuse",
        body: [
          "Do not attempt to defraud anyone, launder money, or use stolen payment details. Do not manipulate escrow, milestones, refunds or disputes dishonestly, and do not use chargebacks in place of our refund and dispute process. We screen for financial crime and will act on what we find.",
        ],
      },
      {
        heading: "Keep work, contact and payments on Xwork",
        body: [
          "Don't share personal contact details or external links to move a relationship off the platform, and don't arrange to pay or be paid outside Xwork. This is what allows escrow to protect payments and lets us help if something goes wrong.",
          "We enforce this with a five-strike policy: messages that try to take contact or payment off-platform aren't delivered, you receive a warning (with a notice on your profile and an email), and after five warnings the account is permanently suspended.",
        ],
      },
      {
        heading: "Respect intellectual property",
        body: [
          "Only upload or deliver work you have the right to use. Honour the ownership and licensing terms you agree in each contract, and don't reuse a client's confidential materials beyond what the contract allows. If you believe your rights have been infringed, see the intellectual-property complaints section of our Terms of Service.",
        ],
      },
      {
        heading: "Who this applies to and eligibility",
        body: [
          "This policy applies to everyone who uses Xwork — clients, freelancers and visitors — and to everything you post, send, upload or do on the Site. You must be at least 18 years old and legally able to enter contracts to use Xwork.",
          "You are responsible for everything that happens under your account. Keep your login credentials private, and don't let anyone else use your account or maintain extra or duplicate accounts to get around limits or enforcement.",
        ],
      },
      {
        heading: "Treat people with respect",
        body: [
          "Xwork is a professional marketplace used by people from many countries, cultures and backgrounds. Communicate professionally and in good faith. Harassment, bullying, intimidation, hate speech, sexual harassment, threats, and abusive or demeaning language toward other users or our staff are never acceptable.",
          "Do not discriminate against people on the basis of race, colour, ancestry, national origin, religion, sex, gender identity, sexual orientation, age, disability, or any other characteristic protected by applicable law — whether in job posts, proposals, hiring decisions communicated on the platform, or messages.",
        ],
      },
      {
        heading: "Respect other people's privacy",
        body: [
          "Do not collect, store, publish or share another person's private or personal information without a lawful basis and their permission. Do not use Xwork to harvest data about other users, and do not use information you receive during a contract for anything other than performing that contract.",
          "Handle any personal data a client or freelancer entrusts to you responsibly and in line with the confidentiality terms of your agreement and applicable data-protection law.",
        ],
      },
      {
        heading: "Automated access, scraping and AI",
        body: [
          "Do not use bots, crawlers, scrapers or other automated means to access, index or collect data from Xwork without our written permission, and do not attempt to reconstruct our database or listings. Do not create fake accounts or use automation to generate proposals, messages, reviews or activity.",
          "You may use AI tools to help you do genuine work, but you remain fully responsible for what you deliver — it must be your own accountable work, must not infringe anyone's rights, and must meet what you agreed with the other party. Misrepresenting AI-generated output as something it isn't, or using it to spam or deceive, is not allowed.",
        ],
      },
      {
        heading: "Lawful use, sanctions and prohibited goods",
        body: [
          "Use Xwork only for lawful purposes and only where the law allows. Do not post or solicit work that is illegal where it will be performed, and do not use the Site to deal in prohibited or regulated goods and services — including weapons, illegal drugs, stolen data or credentials, counterfeit items, or anything that exploits or endangers minors.",
          "You must comply with all applicable sanctions, export-control and trade laws, and you may not use Xwork if you are located in a comprehensively sanctioned region or are on a restricted-party list.",
        ],
      },
      {
        heading: "Protect the platform",
        body: [
          "Do not attempt to break, overload, probe or bypass the security of the Site; do not use bots, scrapers or other automated means to access or collect data without our permission; and do not interfere with other users' use of Xwork.",
        ],
      },
      {
        heading: "Security research and responsible disclosure",
        body: [
          "We welcome good-faith security research, but it must be responsible. Do not access, modify, or delete data that isn't yours, degrade the service for others, or use a vulnerability beyond what's needed to demonstrate it. Report anything you find privately through Help & support and give us a reasonable chance to fix it before disclosing it elsewhere.",
        ],
      },
      {
        heading: "Enforcement",
        body: [
          "Depending on the severity, we may remove content, issue warnings, limit features, hold funds, or suspend or permanently close an account. Serious matters — such as fraud, threats of harm, or illegal activity — may be reported to the relevant authorities. We aim to be fair and proportionate, and to act immediately where there is risk of harm.",
        ],
      },
      {
        heading: "Reporting a violation",
        body: [
          "If you see something that breaks these rules, please report it using the options on the relevant page, or through Help & support, with as much detail as you can. Reports help us keep Xwork safe for everyone.",
        ],
      },
      {
        heading: "Appealing a decision",
        body: [
          "We try to be fair and proportionate, and we know automated systems and human reviewers can occasionally get it wrong. If your content was removed, a violation was recorded against your account, or your account was limited or suspended and you believe it was a mistake, you can appeal through Help & support.",
          "Explain what happened and include anything that supports your case. A person will review your appeal, and where a decision was incorrect we will reverse it and restore what was affected. You can always see the violations recorded against a freelancer account, and their effect, on the Account Health page.",
        ],
      },
    ],
  },
  "ca-notice": {
    title: "CA Notice at Collection",
    subtitle: "For residents of California.",
    sections: [
      {
        heading: "What this means",
        body: [
          "When you use Xwork we collect the information described in our Privacy Policy — things like your name, contact details, and account activity — to run the marketplace.",
          "We do not sell your personal information. You can request access to or deletion of your information through our Contact page.",
        ],
      },
    ],
  },
  accessibility: {
    title: "Accessibility",
    subtitle: "Xwork should work for everyone, on any device, with any assistive technology.",
    sections: [
      {
        heading: "Our commitment",
        body: [
          "Accessibility is part of how we build Xwork, not an afterthought. We want every client and freelancer — including people who are blind or have low vision, who are deaf or hard of hearing, who have motor or cognitive differences, or who simply prefer the keyboard — to be able to find work, hire talent, message, and get paid without barriers.",
          "We aim to align with the internationally recognised Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA as our working standard, and we treat accessibility issues as real bugs to be fixed, not optional polish.",
        ],
      },
      {
        heading: "What we build in",
        body: [
          "Keyboard navigation: you can reach and operate the things you need — menus, forms, job applications, messaging — using the keyboard alone, with a visible focus indicator so you always know where you are.",
          "Screen-reader support: we use meaningful headings, labels on form fields and icon buttons, and descriptive link text so screen readers can announce the page clearly.",
          "Readable design: we work toward sufficient colour contrast, text that can be resized or zoomed without breaking the layout, and a responsive design that adapts from large monitors down to phones.",
          "Respecting your settings: where possible we honour your system and browser preferences, such as reduced motion and larger text.",
        ],
      },
      {
        heading: "Areas we're still improving",
        body: [
          "We're an actively developing product, and some areas are further along than others. We're working through an accessibility pass across the whole app — starting with the highest-traffic pages like the dashboards, profiles, the job feed and messaging — and tightening labels, contrast and keyboard flows as we go.",
          "If part of the Site doesn't yet meet the standard above, that's a gap we want to close, not the experience we're aiming for.",
        ],
      },
      {
        heading: "Tips for the best experience",
        body: [
          "Most modern browsers let you zoom with Ctrl/Cmd and the plus key, switch on a high-contrast or dark theme, and enable a built-in screen reader (VoiceOver on Mac/iOS, Narrator on Windows, TalkBack on Android). Xwork also includes its own light and dark themes in your settings.",
        ],
      },
      {
        heading: "The standard we measure against",
        body: [
          "Our working standard is the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA, published by the World Wide Web Consortium (W3C) and referenced by accessibility laws around the world — including the Americans with Disabilities Act (ADA) and Section 508 in the United States, the European Accessibility Act and EN 301 549 in the EU, and equivalent frameworks elsewhere.",
          "WCAG is organised around four principles: content should be Perceivable (you can perceive it, whatever your senses), Operable (you can operate it, whatever your input method), Understandable (it behaves predictably and clearly), and Robust (it works with current and future assistive technologies). We use these principles as the yardstick for new features and for fixing existing ones.",
        ],
      },
      {
        heading: "Assistive technologies we aim to support",
        body: [
          "We design and test with the assistive technologies people actually use: screen readers such as VoiceOver (macOS and iOS), Narrator (Windows), NVDA and JAWS (Windows), and TalkBack (Android); full keyboard-only navigation; browser and operating-system zoom and text scaling; high-contrast and dark modes; and voice-control and switch-access tools.",
          "If you rely on an assistive technology we haven't named and something doesn't work as it should, that's exactly the kind of report we want — it helps us broaden the range of tools we test against.",
        ],
      },
      {
        heading: "Known limitations and honesty about gaps",
        body: [
          "Xwork is an actively developing product, and we'd rather be honest than overstate. Some newer or complex interfaces — rich text editing, certain drag-based interactions, live-updating areas such as messaging, and some data-dense tables — may not yet fully meet Level AA in every case.",
          "Where a part of the Site doesn't meet the standard, we treat that as a defect to be fixed, not the intended experience. We prioritise fixes by how much they affect people's ability to do the core things: find work, hire, communicate, and get paid.",
        ],
      },
      {
        heading: "How we test and keep it from regressing",
        body: [
          "Accessibility isn't a one-time audit for us. We combine automated checks during development with manual keyboard and screen-reader testing on the highest-traffic flows, and we fold accessibility into how we review new work so that fixes don't quietly regress later.",
          "As the product grows, our aim is to widen this coverage steadily rather than declare the job finished — accessibility is maintained, not completed.",
        ],
      },
      {
        heading: "Requesting help or an accommodation",
        body: [
          "If an accessibility barrier is preventing you from doing something important on Xwork — applying to a job, responding to a client, managing a contract or withdrawing your earnings — contact us through Help & support and tell us what you were trying to do. We will work with you to find a way to complete the task while we fix the underlying issue.",
          "If you need information from the Site in a different format, let us know and we'll do our best to provide a suitable alternative.",
        ],
      },
      {
        heading: "Tell us about a barrier",
        body: [
          "If you hit an accessibility barrier anywhere on Xwork, please tell us through Help & support and describe what happened, the page you were on, and the device or assistive technology you were using. We aim to acknowledge accessibility reports quickly and to keep you updated as we work on a fix. Reports like these go straight onto our fix list and directly shape what we improve next — thank you for helping us make Xwork work for everyone.",
        ],
      },
    ],
  },
  sitemap: {
    title: "Sitemap",
    subtitle: "Find your way around Xwork.",
    sections: [
      {
        heading: "Main pages",
        body: [
          "Home, Find talent, Find work, Pricing, Log in, and Sign up are all reachable from the top of any page.",
        ],
      },
      {
        heading: "For clients",
        body: ["How to hire, Talent Marketplace, Project Catalog, Enterprise."],
      },
      {
        heading: "For talent",
        body: ["How to find work, Find freelance jobs, Win work with ads."],
      },
    ],
  },

  // ---------------- For Clients ----------------
  "how-to-hire": {
    title: "How to hire on Xwork",
    subtitle: "From posting a job to paying for great work — here's the whole journey.",
    sections: [
      {
        heading: "1. Post a job — it's free",
        body: [
          "Tell us what you need done. Posting a fixed-price job is always free and takes just a few minutes: add a clear title, pick a category, list the skills you're after, describe the scope, and set a budget.",
          "The clearer your job post, the better the proposals you'll get. Mention what success looks like, any deadlines, and the kind of experience you'd like to see.",
        ],
      },
      {
        heading: "2. Review proposals",
        body: [
          "Freelancers apply to your job for free, and each job receives proposals from up to 50 applicants. Compare their proposals alongside their profiles, ratings, reviews, Job Success Score and work history.",
          "Look for trust signals like an identity-verified badge and Top Rated or Rising Talent status, then shortlist your favourites and message them to ask questions before you decide.",
        ],
      },
      {
        heading: "3. Hire and collaborate",
        body: [
          "Send an offer to the freelancer you choose. Break the work into milestones — each with its own deliverable and price — so progress is clear for both sides.",
          "Once hired, you collaborate in one place: messaging, file sharing and your contract all live on Xwork, which keeps everything organised and protected.",
        ],
      },
      {
        heading: "4. Pay safely with escrow",
        body: [
          "You fund each milestone into secure escrow before work begins. The freelancer can see the money is set aside, but it isn't released until you approve the work — so you only ever pay for work you're happy with.",
          "Xwork's client service fee is a low 2%, with no hidden charges. If something isn't right, you can request changes, agree a refund, or open a dispute, all covered by our Refund Policy.",
        ],
      },
      {
        heading: "5. Leave a review and rehire",
        body: [
          "When the contract wraps up, leave an honest review to help the community — and the freelancer can review you too. Found someone great? You can rehire them for future work in a couple of clicks.",
        ],
      },
    ],
  },
  "project-catalog": {
    title: "Project Catalog",
    subtitle: "Ready-to-buy projects with clear scope, price and delivery time.",
    sections: [
      {
        heading: "What Project Catalog is",
        body: [
          "Project Catalog is a way to buy a clearly-defined service without posting a job and reviewing proposals. Instead of describing what you need and waiting, you browse packaged projects that freelancers have pre-defined — each with a fixed price, a set scope, and a delivery timeline — and buy the one that fits.",
          "It's ideal for well-understood, repeatable work: a logo, a landing page, a product video, an SEO audit, and so on.",
        ],
      },
      {
        heading: "Why buyers like it",
        body: [
          "You know exactly what you're getting, what it costs, and when it will arrive before you commit — no back-and-forth required. Payment is still protected by escrow, so your money is only released when the work is delivered and approved.",
        ],
      },
      {
        heading: "Status and what to do now",
        body: [
          "Project Catalog is on our roadmap and not yet live. In the meantime, the fastest way to get the same outcome is to post a fixed-price job describing the package you want — freelancers will come to you, often within hours, and you can hire with the same escrow protection.",
        ],
      },
    ],
  },
  "hire-an-agency": {
    title: "Hire an agency",
    subtitle: "Bring on a whole team for larger or ongoing projects.",
    sections: [
      {
        heading: "When an agency makes sense",
        body: [
          "Some projects are bigger than one person — a full product build, a brand and website together, or ongoing marketing that needs designers, writers and developers working in step. An agency brings several specialists under one roof, with someone coordinating the work for you.",
        ],
      },
      {
        heading: "How hiring an agency works",
        body: [
          "You post your project just as you would for an individual, describe the scope and outcome you want, and choose talent that operates as a team. The same protections apply: a clear contract, milestones, and escrow so you only pay for approved work.",
        ],
      },
      {
        heading: "Status and what to do now",
        body: [
          "Dedicated agency profiles are part of our roadmap. Today you can still assemble a team by hiring complementary freelancers for the different parts of your project, or hiring a senior freelancer who can bring in collaborators.",
        ],
      },
    ],
  },
  enterprise: {
    title: "Xwork for Enterprise",
    subtitle: "Hire flexible talent at scale, with the support to match.",
    sections: [
      {
        heading: "Built for bigger teams",
        body: [
          "Enterprise is designed for larger organisations that hire freelancers regularly and need more structure around it: curated talent, shared team workspaces, consolidated billing, and dedicated support to keep many projects moving at once.",
        ],
      },
      {
        heading: "What it's designed to offer",
        body: [
          "Centralised hiring and reporting so finance and procurement have visibility; help shortlisting vetted talent for your roles; and a single point of contact for support — all on top of the same secure, escrow-protected payments that power the rest of Xwork.",
        ],
      },
      {
        heading: "Talk to us",
        body: [
          "Enterprise features are rolling out gradually. If your organisation wants to hire flexible talent at scale, reach out through our Contact page and we'll help you get set up and tell you what's available today.",
        ],
      },
    ],
  },

  // ---------------- For Talent ----------------
  "how-to-find-work": {
    title: "How to find work on Xwork",
    subtitle: "Turn your skills into income — here's how to get hired and get paid.",
    sections: [
      {
        heading: "1. Create a standout profile",
        body: [
          "Your profile is your storefront. Add a clear professional title, the skills you offer, your rate, and a portfolio that shows your best work. Use a genuine photo of yourself and write a short, specific overview of what you do and who you help.",
          "A complete, honest profile ranks better in search and earns more trust. Verifying your identity adds a badge that reassures clients and is required before you can be paid.",
        ],
      },
      {
        heading: "2. Find and apply to jobs — for free",
        body: [
          "Browse fixed-price jobs that match your skills and apply at no cost. Xwork never charges credits or \"connects\" to apply — applying is completely free.",
          "Apply early: each job accepts only the first 50 applicants, so the sooner you send a thoughtful, tailored proposal, the better your odds. Reference the client's actual needs, keep it concise, and explain how you'll deliver.",
        ],
      },
      {
        heading: "3. Win the contract",
        body: [
          "Clients compare your proposal with your profile, reviews and Job Success Score, and may message you with questions — reply promptly and professionally. Agree the scope, price and milestones before you start.",
        ],
      },
      {
        heading: "4. Do the work and get paid securely",
        body: [
          "The client funds each milestone into escrow before you begin, so you can see your payment is secured. Deliver the work, get it approved, and the funds (less the 10% freelancer service fee) land in your balance. There's no upfront cost to start — you only pay a fee when you earn.",
          "Add a payout method (PayPal, Payoneer or bank) once your identity is verified, and withdraw your available balance.",
        ],
      },
      {
        heading: "5. Build your reputation",
        body: [
          "Great work earns great reviews, which lift your Job Success Score and can unlock badges like Rising Talent and Top Rated. A strong track record brings repeat clients and better opportunities over time.",
        ],
      },
    ],
  },
  "win-work-with-ads": {
    title: "Win work with ads",
    subtitle: "Give your proposals a boost and stand out on competitive jobs.",
    sections: [
      {
        heading: "The idea",
        body: [
          "On popular jobs, dozens of freelancers apply. Promoted proposals are a way to give yours extra visibility — for example, by placing it where the client is more likely to see it first — so strong candidates don't get lost in a crowded list.",
        ],
      },
      {
        heading: "How to stand out today",
        body: [
          "Paid promotion isn't live yet, but the fundamentals win work right now: apply early (remember, only the first 50 applicants are accepted), tailor every proposal to the client's actual problem, keep it short and specific, and back it up with a complete profile, a relevant portfolio and a healthy Job Success Score.",
        ],
      },
      {
        heading: "Status",
        body: [
          "Proposal promotion is on our roadmap. We'll announce it here and in your dashboard when it's ready, along with exactly how it works and what it costs.",
        ],
      },
    ],
  },
  "freelancer-resources": {
    title: "Freelancer resources",
    subtitle: "Practical guides to help you win work and grow your business.",
    sections: [
      {
        heading: "Write proposals that win",
        body: [
          "The best proposals are short, specific and about the client — not about you. Open by showing you understand their problem, explain your approach in a sentence or two, point to one relevant example, and end with a clear next step. Apply early, since each job caps at 50 applicants.",
        ],
      },
      {
        heading: "Set your rate with confidence",
        body: [
          "Price for the value you deliver, not just the hours. Look at what similar freelancers charge, factor in the 10% service fee, and don't be afraid to start a little lower to build reviews — then raise your rate as your Job Success Score and portfolio grow.",
        ],
      },
      {
        heading: "Build a profile clients trust",
        body: [
          "Complete every section, use a real photo, verify your identity for the badge, and keep your portfolio current. Trust signals like reviews, a strong Job Success Score and Top Rated or Rising Talent status make clients far more likely to hire you.",
        ],
      },
      {
        heading: "Protect yourself — stay on Xwork",
        body: [
          "Keep all chat and payments on Xwork. It's how escrow protects your earnings and how we can step in if there's a problem. Moving off-platform isn't allowed and puts your payment and your account at risk.",
        ],
      },
      {
        heading: "More guides coming",
        body: [
          "We're building out a fuller library on growing a freelance business — managing clients, scoping projects, and getting repeat work. Check back as we add to it.",
        ],
      },
    ],
  },

  // ---------------- Resources ----------------
  help: {
    title: "Help & support",
    subtitle: "Answers, guides, and a real person when you need one.",
    sections: [
      {
        heading: "Getting started",
        body: [
          "New to Xwork? If you're hiring, read How to hire to go from posting a job to paying for great work. If you're freelancing, How to find work walks you through your profile, applying for free, and getting paid securely.",
        ],
      },
      {
        heading: "Payments, escrow and withdrawals",
        body: [
          "Payments for fixed-price work are held in escrow and released when a milestone is approved. Freelancers withdraw their available balance to a payout method once their identity is verified. For who pays what and when refunds apply, see our Refund Policy.",
        ],
      },
      {
        heading: "Account, security and verification",
        body: [
          "Manage your profile, notifications and security from Settings. We recommend turning on two-step verification. Freelancers verify their identity once to unlock payouts and earn a verified badge.",
        ],
      },
      {
        heading: "Trust and safety",
        body: [
          "Keep all chat and payments on Xwork — it's how we protect your money and can help if something goes wrong. If you see something that isn't right, report it from the relevant page or through Contact us.",
        ],
      },
      {
        heading: "Still need help?",
        body: [
          "Can't find an answer? Reach out through our Contact page and a real person will help you sort it out.",
        ],
      },
    ],
  },
  "success-stories": {
    title: "Success stories",
    subtitle: "How real people get great work done on Xwork.",
    sections: [
      {
        heading: "Clients who shipped faster",
        body: [
          "From solo founders to growing teams, clients use Xwork to find the right freelancer quickly, agree clear milestones, and ship projects without the overhead of traditional hiring — paying only for work they approve.",
        ],
      },
      {
        heading: "Freelancers who grew a business",
        body: [
          "Freelancers use Xwork to find steady, fairly-paid work, build a reputation through honest reviews and a Job Success Score, and turn one-off projects into repeat clients.",
        ],
      },
      {
        heading: "Share yours",
        body: [
          "Have a story about work you found or talent you hired on Xwork? We'd love to feature it — tell us through the Feedback page. (Quotes shown elsewhere on the site are illustrative samples until we publish real, consented stories here.)",
        ],
      },
    ],
  },
  "xwork-reviews": {
    title: "Xwork reviews",
    subtitle: "Reputation you can actually trust.",
    sections: [
      {
        heading: "Reviews from real contracts",
        body: [
          "Every rating and review on Xwork comes from a real, completed contract between a client and a freelancer. That means the work history you see on a profile reflects genuine working relationships — not anonymous or purchased feedback.",
        ],
      },
      {
        heading: "Two-way and honest",
        body: [
          "Both sides review each other after a contract ends, so clients and freelancers alike build a track record. Reviews can't be traded, incentivised or faked, and manipulating them breaks our rules.",
        ],
      },
      {
        heading: "How scores are built",
        body: [
          "We turn this genuine feedback into trust signals — an average rating, a Job Success Score, and badges like Rising Talent and Top Rated — to help you judge who to work with at a glance.",
        ],
      },
    ],
  },
  blog: {
    title: "Xwork Blog",
    subtitle: "News, tips, and stories from the world of flexible work.",
    sections: [
      {
        heading: "What you'll find here",
        body: [
          "We're building a blog with practical advice for both sides of the marketplace: hiring guides and project tips for clients, and proposal, pricing and profile advice for freelancers — plus product updates and stories from the community.",
        ],
      },
      {
        heading: "Coming soon",
        body: [
          "Articles are on the way. Until then, our How to hire and How to find work guides and the Freelancer resources page cover the essentials. Want us to write about something specific? Tell us via Feedback.",
        ],
      },
    ],
  },
  affiliate: {
    title: "Affiliate program",
    subtitle: "Earn by introducing people to Xwork.",
    sections: [
      {
        heading: "How it will work",
        body: [
          "Our affiliate program will let creators, communities and partners share Xwork and earn rewards when the people they refer join and start hiring or working. You'll get a link to share and a simple dashboard to track sign-ups and earnings.",
        ],
      },
      {
        heading: "Status",
        body: [
          "The program is in development. If you have an audience that would benefit from Xwork and want to be an early partner, reach out through Contact us and we'll let you know when it opens.",
        ],
      },
    ],
  },
  "refer-a-client": {
    title: "Refer a client",
    subtitle: "Know a business that needs to hire? Send them our way.",
    sections: [
      {
        heading: "Why refer",
        body: [
          "If you know a business or founder who needs work done, Xwork helps them find vetted talent quickly, with free job posting and escrow-protected payments. Referring them is a simple way to help — and to be rewarded for it.",
        ],
      },
      {
        heading: "How it will work",
        body: [
          "You'll share a referral link, and when a new client joins through it and starts hiring, you earn a reward. A simple dashboard will track your referrals.",
        ],
      },
      {
        heading: "Status",
        body: [
          "Referral rewards are coming soon. In the meantime, you're very welcome to point friends and colleagues to Xwork — they can sign up and post a job for free.",
        ],
      },
    ],
  },
  "release-notes": {
    title: "Release notes",
    subtitle: "What's new and improved on Xwork.",
    sections: [
      {
        heading: "How we ship",
        body: [
          "We improve Xwork continuously and list notable changes here — new features, improvements and fixes — so you can see how the platform is evolving.",
        ],
      },
      {
        heading: "Recent highlights",
        body: [
          "Free job applications with a fair 50-applicant limit per job; reviews, ratings and a Job Success Score; Top Rated and Rising Talent badges; client payment-verified labels; a dedicated withdrawals page with payout methods; a tax-information form; two-step verification; file attachments and read receipts in messaging; and detailed Terms, User Agreement and Refund Policy.",
        ],
      },
      {
        heading: "Coming next",
        body: [
          "We're continuing to expand search and discovery, trust and safety tooling, and accessibility across the app. Have a request? Share it through Feedback.",
        ],
      },
    ],
  },

  // ---------------- Company ----------------
  about: {
    title: "About Xwork",
    subtitle: "The marketplace built for the future of work.",
    sections: [
      {
        heading: "Our mission",
        body: [
          "Xwork exists to connect great clients with great freelancers, simply and fairly. We believe getting work done — and getting paid for it — should be straightforward, transparent and safe for both sides, wherever in the world you are.",
        ],
      },
      {
        heading: "What we stand for",
        body: [
          "Low, honest fees with no hidden charges. Free job posting and free applications. Payments protected by escrow so freelancers are paid for completed work and clients only pay for work they approve. And a friendly, human experience instead of a cold transaction.",
        ],
      },
      {
        heading: "How we're different",
        body: [
          "We focus on clear, fixed-price work with milestones, real reviews from completed contracts, and trust signals like the Job Success Score and verified badges. We keep conversations and payments on-platform so we can actually protect you.",
        ],
      },
      {
        heading: "Where we're headed",
        body: [
          "Xwork is growing quickly, and we're continually adding features — better search and discovery, stronger trust and safety, and more ways to get paid. Our north star stays the same: make flexible work fair and accessible to everyone.",
        ],
      },
    ],
  },
  leadership: {
    title: "Leadership",
    subtitle: "The people behind Xwork.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "Xwork is built by a small, focused team that cares deeply about making freelancing work for everyone — from the freelancer earning their first review to the business hiring its tenth contractor.",
        ],
      },
      {
        heading: "How we work",
        body: [
          "We stay close to our community, ship improvements often, and make decisions in the open. The people who use Xwork shape where it goes next.",
        ],
      },
      {
        heading: "Get in touch",
        body: [
          "Want to reach the team? The Contact us page is the best way, and we read every message.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers",
    subtitle: "Help us build the future of work.",
    sections: [
      {
        heading: "Why Xwork",
        body: [
          "We're building a marketplace that gives people around the world access to good, flexible work. If that mission excites you, you'll fit right in.",
        ],
      },
      {
        heading: "How we operate",
        body: [
          "We value ownership, craft and clear communication over process for its own sake. Expect a small team, real responsibility, and the chance to see your work in front of users quickly.",
        ],
      },
      {
        heading: "Open roles",
        body: [
          "Specific openings will be listed here as we grow. In the meantime, if you're talented and care about this space, introduce yourself through Contact us — we're always glad to meet good people.",
        ],
      },
    ],
  },
  impact: {
    title: "Our impact",
    subtitle: "Work that makes a difference, wherever talent lives.",
    sections: [
      {
        heading: "Opportunity for all",
        body: [
          "Talent is everywhere, but opportunity isn't always. By connecting people to flexible, fairly-paid work online, Xwork helps create opportunity regardless of where someone lives or where they went to school.",
        ],
      },
      {
        heading: "Fair and transparent",
        body: [
          "Low, clearly-stated fees mean more of what's earned stays with the freelancer. Escrow protection and honest reviews build the trust that lets new freelancers get their first break and clients hire with confidence.",
        ],
      },
      {
        heading: "Built to be inclusive",
        body: [
          "We're committed to an accessible platform and a respectful community, so that as many people as possible can take part in the future of work.",
        ],
      },
    ],
  },
  press: {
    title: "Press",
    subtitle: "Media resources and announcements.",
    sections: [
      {
        heading: "About Xwork",
        body: [
          "Xwork is an online marketplace connecting clients with freelancers for fixed-price work, with free job posting, free applications, escrow-protected payments, and low service fees.",
        ],
      },
      {
        heading: "Media inquiries",
        body: [
          "For interviews, data or comment, please reach out through our Contact page and we'll get back to you promptly. Brand assets and a press kit will be made available here.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact us",
    subtitle: "We'd love to hear from you — and a real person will reply.",
    sections: [
      {
        heading: "Account, jobs and payments",
        body: [
          "For help with your account, a job, a proposal, a contract or a payment, start with our Help & support page — most questions are answered there, with step-by-step guidance.",
        ],
      },
      {
        heading: "Trust and safety",
        body: [
          "To report a suspicious message, job or user, use the reporting options on the relevant page so we have the context, or contact us directly. Keep all communication and payments on Xwork so we can help if something goes wrong.",
        ],
      },
      {
        heading: "General inquiries",
        body: [
          "For anything else — partnerships, press, feedback or just to say hello — email us at hello@xwork.example and we'll get back to you as soon as we can.",
        ],
      },
    ],
  },
  partners: {
    title: "Partners",
    subtitle: "Grow with Xwork.",
    sections: [
      {
        heading: "Partner with us",
        body: [
          "We work with tools, communities and organisations that help clients and freelancers succeed — from integrations that make work smoother to communities that bring great talent to the platform.",
        ],
      },
      {
        heading: "Who we partner with",
        body: [
          "Software and service providers, educators and training programs, freelancer communities, and organisations expanding access to digital work are all natural partners for Xwork.",
        ],
      },
      {
        heading: "Let's talk",
        body: [
          "Interested in partnering? Reach out through Contact us with a few words about who you are and what you have in mind, and we'll take it from there.",
        ],
      },
    ],
  },
  feedback: {
    title: "Feedback",
    subtitle: "Your ideas shape what we build next — here's how to share them and what happens after you do.",
    sections: [
      {
        heading: "We're listening",
        body: [
          "Xwork gets better because of the people who use it every day. Whether you're a freelancer trying to win your next contract or a client hiring for a critical project, you see things we don't — the small friction points, the missing feature that would save you an hour, the wording that confused you the first time. We read every piece of feedback that comes in, and a great deal of what we build starts as a message from someone exactly like you.",
          "There are no wrong answers here. Tell us what's working, what's confusing, what's missing, or what you'd love to see next. Even a single sentence helps, and detailed feedback helps even more.",
        ],
      },
      {
        heading: "Ways to share feedback",
        body: [
          "Open a support request. The most reliable way to reach us is through Help & support, where you can open a request in the category that fits — a feature idea, a problem, or a general comment. You'll get a confirmation that we received it, it's tracked in your support requests, and our team can reply to you directly in the same thread.",
          "Report a problem in context. If something feels off while you're using a particular page, note what you were doing and where — that context is often the difference between a bug we can fix in minutes and one we can't reproduce.",
          "Share a feature idea. If you wish Xwork did something it doesn't yet, describe the outcome you're after rather than only the mechanism. \"I want to see which of my proposals a client actually opened\" tells us more than \"add a notification,\" because it lets us find the best way to solve the real need.",
        ],
      },
      {
        heading: "Reporting a bug",
        body: [
          "Found something broken? The most useful bug reports include four things: what you expected to happen, what actually happened, the exact page or link where it happened, and the device and browser you were using (for example, \"iPhone Safari\" or \"Windows Chrome\"). A screenshot, if you can include one, is worth a thousand words.",
          "Accessibility issues are treated as real bugs, not optional polish. If a screen reader announced something incorrectly, a control couldn't be reached by keyboard, or contrast made text hard to read, tell us the same way — those reports go straight onto our fix list.",
        ],
      },
      {
        heading: "Reporting a security vulnerability",
        body: [
          "If you believe you've found a security vulnerability — a way to access data you shouldn't, bypass a protection, or affect other users — please report it privately through Help & support and mark it as security, rather than posting it publicly or testing it against other people's accounts.",
          "We appreciate responsible disclosure and will investigate every credible report. Please give us a reasonable opportunity to fix an issue before sharing it more widely, and never access, modify or delete data that isn't yours while testing. Acting in good faith to protect the community is always welcome.",
        ],
      },
      {
        heading: "How we prioritise what to build",
        body: [
          "We can't build everything at once, so we weigh a few things: how many people a change would help, how much friction or risk it removes, whether it protects payments or safety, and how it fits the direction of the product. Something that helps a freelancer get paid safely or a client hire with confidence will usually rise to the top.",
          "That means not every request ships, and some take time. A quiet queue doesn't mean your idea was ignored — popular and high-impact themes genuinely shape our roadmap, even when the final feature looks a little different from the original suggestion.",
        ],
      },
      {
        heading: "What happens after you submit",
        body: [
          "When you send feedback through a support request, you'll receive an acknowledgement, and you can follow the thread in your support requests. If we need more detail to act on it, we'll ask. If it's a bug, it goes into our tracking so it can be reproduced and fixed. If it's an idea, it's grouped with similar requests so we can see the patterns.",
          "We can't promise a build date or individual updates on every idea, but nothing disappears into a void — the themes that come up again and again are exactly the ones that move.",
        ],
      },
      {
        heading: "A note on your ideas",
        body: [
          "When you choose to send us suggestions or feedback, you allow us to use them to improve Xwork without any obligation or payment to you, as described in our Terms of Service. This simply lets us act on good ideas freely; it doesn't affect ownership of the work you do on the platform.",
        ],
      },
      {
        heading: "How to reach us",
        body: [
          "Open a request any time through Help & support. For anything urgent — a payment problem, a suspected security issue, or something affecting your ability to work — use a support request and flag it clearly so we can prioritise it. Thank you for helping us make Xwork better for everyone.",
        ],
      },
    ],
  },
  foundation: {
    title: "Xwork Foundation",
    subtitle: "Investing in access to digital work.",
    sections: [
      {
        heading: "Our purpose",
        body: [
          "The Xwork Foundation supports programs that expand access to digital skills and online work opportunities, so more people can take part in the global economy regardless of their background or location.",
        ],
      },
      {
        heading: "What we focus on",
        body: [
          "Digital-skills training, connectivity and equipment access, and mentorship that helps new freelancers build a sustainable income are the kinds of initiatives the Foundation aims to support.",
        ],
      },
      {
        heading: "Get involved",
        body: [
          "Programs and partnerships will be announced here. If you run an initiative in this space or want to support one, reach out through Contact us to learn more.",
        ],
      },
    ],
  },
  "cookie-policy": {
    title: "Cookie Policy",
    subtitle: "How and why Xwork uses cookies. Last updated June 2026.",
    sections: [
      {
        heading: "What cookies are",
        body: [
          "Cookies are small text files a website stores on your device. They let a site remember things between pages and visits — like keeping you signed in. Similar technologies (such as local storage) do comparable jobs, and we refer to them all as \"cookies\" here.",
        ],
      },
      {
        heading: "The cookies we use",
        body: [
          "Essential cookies: needed for the Site to work — for example, to keep you securely signed in, to support two-step verification, and to protect against fraud. The Site can't function properly without these.",
          "Preference cookies: remember choices you make, such as light or dark theme, so the Site behaves the way you expect.",
          "Basic analytics: help us understand how the Site is used so we can fix problems and improve features. We keep this lightweight.",
        ],
      },
      {
        heading: "What we don't do",
        body: [
          "We keep our use of cookies minimal. We do not use cookies to build advertising profiles or to track you across unrelated websites, and we do not sell information collected through cookies.",
        ],
      },
      {
        heading: "Managing cookies",
        body: [
          "You can clear or block cookies in your browser settings, and most browsers let you do this per-site. Blocking essential cookies may stop you from staying logged in or using parts of the Site.",
          "Where the law requires consent for non-essential cookies, we will ask for it and respect your choice.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If we change how we use cookies, we'll update this page. For more on how we handle your information generally, see our Privacy Policy.",
        ],
      },
    ],
  },
  "your-privacy-choices": {
    title: "Your Privacy Choices",
    subtitle: "You're in control of your data.",
    sections: [
      { heading: "Your choices", body: ["We don't sell your personal information. You can view and edit most of your data in your account settings, and you can close your account at any time."] },
      { heading: "Requests", body: ["To request a copy of your data or have it deleted, reach out through our Contact page and we'll help."] },
    ],
  },
  "desktop-app": {
    title: "Xwork Desktop App",
    subtitle: "Work from your desktop.",
    sections: [
      { heading: "Coming soon", body: ["A desktop app for Windows and Mac is on the way, with built-in notifications and time tracking. We'll announce it here as soon as it's ready."] },
    ],
  },
  "mobile-app": {
    title: "Xwork Mobile App",
    subtitle: "Xwork in your pocket.",
    sections: [
      { heading: "Coming soon", body: ["Mobile apps for iOS and Android are in the works, so you can message clients, review proposals, and manage contracts on the go. Stay tuned."] },
    ],
  },
};
