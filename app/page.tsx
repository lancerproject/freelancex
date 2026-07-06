import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { HeroSearch } from "@/components/hero-search";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES } from "@/lib/categories";
import { wizardResumePath } from "@/lib/wizard";

export default async function HomePage() {
  // Logged-in users go straight to the app.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Resume an unfinished profile if there is one; otherwise the dashboard.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, profile_step")
      .eq("id", user.id)
      .maybeSingle();
    redirect(wizardResumePath(profile) || "/dashboard");
  }

  const howItWorks = [
    {
      title: "Post a job for free",
      body: "Tell us what you need done. Posting a job on Xwork is always free.",
    },
    {
      title: "Review proposals and hire",
      body: "Compare proposals, profiles and reviews, then hire the right person.",
    },
    {
      title: "Pay safely when work is done",
      body: "Funds are held securely and released as milestones are approved.",
    },
  ];

  const testimonials = [
    {
      quote:
        "Xwork made it easy to find a skilled developer and get our project moving within days.",
      name: "Sample Client",
      role: "Founder, Demo Co.",
    },
    {
      quote:
        "We hired a designer through Xwork and the whole process — from proposal to payment — was smooth.",
      name: "Sample Client",
      role: "Marketing Lead, Example Inc.",
    },
    {
      quote:
        "Great talent, simple milestones, and payments we can trust. Exactly what our small team needed.",
      name: "Sample Client",
      role: "Operations, Placeholder LLC",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <LandingHeader />

      {/* Hero */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 pt-8">
        <div className="rounded-3xl bg-neutral-900 text-white p-10 lg:p-16">
          <h1 className="text-4xl lg:text-5xl font-bold max-w-2xl leading-tight">
            Hire the right talent. Get great work done.
          </h1>
          <p className="text-neutral-300 mt-4 max-w-xl">
            Connect with skilled freelancers for any project — design,
            development, writing, marketing and more.
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10 text-center">
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

      {/* Categories */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <h2 className="text-2xl font-bold mb-6">
          Find freelancers for every type of work
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/jobs?category=${encodeURIComponent(c)}`}
              className="rounded-xl border border-neutral-200 p-5 hover:border-primary hover:shadow-sm transition min-h-[140px] flex flex-col"
            >
              <CategoryIcon name={c} />
              <p className="font-medium mt-auto pt-4 text-neutral-900">{c}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <h2 className="text-2xl font-bold mb-6">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {howItWorks.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-neutral-200 p-6">
              <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <h3 className="font-semibold text-lg mt-4">{s.title}</h3>
              <p className="text-neutral-600 text-sm mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <h2 className="text-2xl font-bold mb-6">What clients say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 p-6">
              <p className="text-neutral-800">“{t.quote}”</p>
              <div className="mt-4">
                <p className="font-semibold text-neutral-900">{t.name}</p>
                <p className="text-sm text-neutral-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Testimonials shown are illustrative samples.
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-[1480px] mx-auto px-6 lg:px-12 py-10">
        <div className="rounded-3xl bg-primary text-primary-foreground p-12 text-center">
          <h2 className="text-3xl font-bold">
            Find freelancers who can help you build what&apos;s next
          </h2>
          <Link
            href="/register"
            className="inline-block mt-6 bg-white text-neutral-900 px-8 py-3 rounded-full font-semibold hover:opacity-90"
          >
            Explore freelancers
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-10">
        <SiteFooter />
      </div>
    </div>
  );
}
