import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { HelpSearch } from "@/components/help-search";
import { HelpChat } from "@/components/help-chat";
import { HELP_CATEGORIES, HELP_ARTICLES } from "@/lib/help-center";

export default function HelpCenterPage() {
  const popular = HELP_ARTICLES.filter((a) =>
    [
      "service-fees",
      "post-a-job",
      "get-paid",
      "reset-password",
      "how-milestones-work",
      "close-account",
    ].includes(a.slug)
  );

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      {/* Hero + search */}
      <section className="bg-neutral-900 text-white">
        <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-16 text-center">
          <h1 className="text-4xl font-bold mb-6">How can we help?</h1>
          <HelpSearch />
        </div>
      </section>

      {/* AI assistant */}
      <section className="max-w-3xl mx-auto px-6 lg:px-12 pt-12">
        <HelpChat />
      </section>

      {/* Categories */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-bold mb-6">Browse help topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {HELP_CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/help/category/${c.key}`}
              className="rounded-xl border border-neutral-200 p-6 hover:border-primary hover:shadow-sm transition"
            >
              <p className="font-semibold text-neutral-900">{c.title}</p>
              <p className="text-sm text-neutral-500 mt-1">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular articles */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 pb-14">
        <h2 className="text-2xl font-bold mb-6">Popular articles</h2>
        <div className="divide-y divide-neutral-200 border-y border-neutral-200 max-w-3xl">
          {popular.map((a) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="flex items-center justify-between py-4 group"
            >
              <span className="text-neutral-800 group-hover:text-primary">
                {a.title}
              </span>
              <span className="text-neutral-400 group-hover:text-primary">
                ›
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-neutral-100 p-8 text-center max-w-3xl">
          <p className="font-semibold text-lg">Still need help?</p>
          <p className="text-neutral-600 mt-1">
            Can&apos;t find what you&apos;re looking for? We&apos;re happy to
            help.
          </p>
          <Link
            href="/support"
            className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
          >
            Open a support request
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
