import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { SkillsAccordion } from "@/components/skills-accordion";

const FLOATING = [
  { name: "Andrea R.", role: "Lead Software Engineer", initials: "AR" },
  { name: "Martin G.", role: "Web Developer", initials: "MG" },
  { name: "Konstantin V.", role: "UX Designer", initials: "KV" },
  { name: "Jane S.", role: "Brand Designer", initials: "JS" },
  { name: "Vanessa J.", role: "Full Stack Developer", initials: "VJ" },
  { name: "Fernando B.", role: "Sr. Product Manager", initials: "FB" },
];

const MARKETS = [
  "Australia", "Canada", "India", "United Kingdom",
  "Philippines", "Spain", "United Arab Emirates", "United States",
  "Ukraine", "Egypt", "Singapore", "Germany",
  "New Zealand", "France", "China", "Nepal",
];

function AvatarChip({
  name,
  role,
  initials,
}: {
  name: string;
  role: string;
  initials: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm px-3 py-2 flex items-center gap-2">
      <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
        {initials}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-medium text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-500">{role}</p>
      </div>
    </div>
  );
}

export default function HirePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      {/* Hero */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 pt-12 pb-8 text-center">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {FLOATING.map((f) => (
            <AvatarChip key={f.name} {...f} />
          ))}
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
          Hire proven freelancers
          <br />
          <span className="bg-primary/20 px-2">who deliver results</span>
        </h1>
        <p className="text-neutral-600 mt-5 max-w-xl mx-auto">
          Post a job, get bids immediately. See verified work history, reviews,
          and certifications. Hire in a few clicks — millions of jobs and
          reviews completed.
        </p>
        <Link
          href="/freelancers"
          className="inline-block mt-7 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:opacity-90"
        >
          Browse freelancers
        </Link>
      </section>

      {/* Safe and secure */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-bold mb-8">
          Safe and secure hiring, for any size of work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              t: "Millions of reviews",
              d: "Develop relationships with highly rated professionals.",
            },
            {
              t: "Protected payments",
              d: "Hassle-free billing so you can focus on work that matters.",
            },
            {
              t: "Hire who you need",
              d: "Find pros who can start right away and handle any job.",
            },
          ].map((c) => (
            <div key={c.t} className="flex gap-3">
              <span className="text-primary text-xl">●</span>
              <div>
                <p className="font-semibold text-neutral-900">{c.t}</p>
                <p className="text-sm text-neutral-600 mt-1">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories accordion */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-8">
        <h2 className="text-2xl font-bold mb-6">
          Choose a category to see popular skills for hire
        </h2>
        <div className="max-w-3xl">
          <SkillsAccordion />
        </div>
      </section>

      {/* Trusted by */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-8 border-t border-neutral-200">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <span className="text-sm text-neutral-400">Trusted by</span>
          {["Northwind", "Acme", "Globex", "Initech", "Umbrella", "Soylent"].map(
            (b) => (
              <span key={b} className="text-neutral-400 font-semibold">
                {b}
              </span>
            )
          )}
        </div>
      </section>

      {/* Explore freelancer markets */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <h2 className="text-xl font-bold mb-5">Explore freelancer markets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-8 text-sm">
          {MARKETS.map((m) => (
            <Link
              key={m}
              href="/freelancers"
              className="text-neutral-700 hover:text-primary hover:underline"
            >
              Freelancers in {m}
            </Link>
          ))}
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 pb-8 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / Hire
      </div>

      <SiteFooter />
    </div>
  );
}
