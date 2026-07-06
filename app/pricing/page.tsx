import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";

function Check() {
  return (
    <svg
      className="h-5 w-5 text-primary shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function PricingPage() {
  const basicIncludes = [
    "Marketplace access — skilled freelancers across thousands of skills",
    "Talent profiles — portfolios, ratings, and work history",
    "Hiring tools — proposals, messages and files in one place",
    "Protected payments — only pay for approved work",
  ];

  const featureGroups = [
    {
      title: "Discover trusted talent",
      features: [
        "Access to Xwork's global work marketplace",
        "ID-verified freelancers",
        "Verified reviews and work history",
        "Easily filter to top freelancers",
      ],
    },
    {
      title: "Engage the right candidates",
      features: [
        "Freelancer invites for your job posts",
        "Direct messages with freelancers",
        "Review proposals in one place",
      ],
    },
    {
      title: "Collaborate and hire",
      features: [
        "Message, share files, and voice or video call",
        "Milestone-based fixed-price contracts",
        "All conversations and files in one workspace",
      ],
    },
    {
      title: "Manage and pay",
      features: [
        "Payment protection and dispute resolution",
        "Secure milestone releases",
        "Operational and financial reporting",
      ],
    },
    {
      title: "Receive support",
      features: ["Customer support access", "Help center and resources"],
    },
  ];

  const faqs = [
    {
      q: "What is Xwork's client service fee and how is it calculated?",
      a: "Clients pay a flat 2% service fee on all payments you make to freelancers for fixed-price contracts. The fee is added to your payment at the time you fund a milestone.",
    },
    {
      q: "How much does a freelancer pay?",
      a: "Freelancers pay a 10% service fee on their earnings. There are no membership or upfront costs to start finding work on Xwork.",
    },
    {
      q: "Are there any other fees?",
      a: "No. There are no hidden charges, no contract initiation fees, and no upfront costs to join. You only pay the service fee when money changes hands.",
    },
    {
      q: "Do I need to verify my identity?",
      a: "Clients do not need to complete identity verification to post jobs and hire. Freelancers complete a one-time identity verification so they can get paid securely.",
    },
    {
      q: "What payment methods do you accept?",
      a: "You can pay with major credit and debit cards. Available options may vary based on your location and will be shown at checkout.",
    },
    {
      q: "When do I pay the service fee?",
      a: "For clients, the 2% fee is applied each time you fund or release a payment. For freelancers, the 10% fee is deducted from each payment you receive.",
    },
    {
      q: "How does Xwork make money?",
      a: "Xwork earns revenue through service fees on both sides of the marketplace — 2% for clients and 10% for freelancers. That's it. No hidden charges.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      {/* Hero */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 pt-12 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold max-w-3xl mx-auto leading-tight">
          Flexible pricing that scales with your business
        </h1>
        <p className="text-neutral-600 mt-5 max-w-2xl mx-auto">
          Access skilled experts who can support one-time projects or complex,
          ongoing work. It&apos;s free to get started — pay only when you hire.
        </p>
        <p className="mt-4 text-neutral-600">
          Looking to work?{" "}
          <Link
            href="/register/freelancer"
            className="text-primary font-medium hover:underline"
          >
            Join as a freelancer
          </Link>
        </p>
      </section>

      {/* Plan card */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <div className="max-w-md mx-auto rounded-2xl border-2 border-primary p-8">
          <h2 className="text-2xl font-bold">Basic</h2>
          <p className="text-neutral-600 mt-1">
            Hire for projects of any size — from quick tasks to ongoing work.
          </p>

          <Link
            href="/register/client"
            className="block text-center mt-6 bg-primary text-primary-foreground rounded-full py-3 font-semibold hover:opacity-90"
          >
            Get started for free
          </Link>

          <p className="text-sm font-semibold text-neutral-900 mt-8 mb-3">
            Basic includes:
          </p>
          <ul className="space-y-3">
            {basicIncludes.map((f) => (
              <li key={f} className="flex gap-3 text-sm text-neutral-700">
                <Check />
                {f}
              </li>
            ))}
          </ul>

          <div className="border-t border-neutral-200 mt-6 pt-6 space-y-2">
            <p className="text-lg">
              <span className="font-bold text-primary">2%</span> service fee for
              clients
            </p>
            <p className="text-lg">
              <span className="font-bold text-primary">10%</span> service fee for
              freelancers
            </p>
            <p className="text-sm text-neutral-500">
              No hidden charges. No contract initiation fees. Clients don&apos;t
              need identity verification.
            </p>
          </div>
        </div>
      </section>

      {/* Key features */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <h2 className="text-3xl font-bold mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureGroups.map((g) => (
            <div key={g.title}>
              <h3 className="text-primary font-semibold mb-4">{g.title}</h3>
              <ul className="space-y-3">
                {g.features.map((f) => (
                  <li
                    key={f}
                    className="flex gap-3 text-sm text-neutral-700 border-b border-neutral-100 pb-3"
                  >
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted by */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-8 text-center">
        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-4">
          Trusted by teams of all sizes
        </p>
        <div className="flex flex-wrap justify-center gap-8 text-neutral-400 font-semibold">
          <span>Northwind</span>
          <span>Acme</span>
          <span>Globex</span>
          <span>Initech</span>
          <span>Umbrella</span>
          <span>Soylent</span>
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <div className="rounded-2xl bg-neutral-100 p-8 md:flex items-center gap-8 max-w-4xl mx-auto">
          <div className="w-full md:w-64 h-44 rounded-xl bg-neutral-300 shrink-0 flex items-end p-4 text-neutral-700 font-medium">
            Sample Client
          </div>
          <div className="mt-4 md:mt-0">
            <h3 className="text-xl font-bold">
              How a growing team gets more done with Xwork
            </h3>
            <p className="text-neutral-600 mt-2">
              A sample story showing how teams bring in specialized freelancers
              across departments and scale their output without growing
              headcount.
            </p>
            <p className="text-xs text-neutral-400 mt-2">
              Illustrative sample.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-6">
        <div className="rounded-2xl bg-primary text-primary-foreground p-10 text-center max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-5">
            Take the first step toward real results
          </h2>
          <Link
            href="/register/client"
            className="inline-block bg-white text-neutral-900 px-8 py-3 rounded-full font-semibold hover:opacity-90"
          >
            Get started today
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-12">
        <div className="md:flex gap-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold md:w-64 shrink-0 mb-6 md:mb-0">
            Frequently asked questions
          </h2>
          <div className="flex-1 space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-neutral-200 pb-6">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {f.q}
                </h3>
                <p className="text-neutral-600 mt-2">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
