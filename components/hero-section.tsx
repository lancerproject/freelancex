"use client"

import { Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const stats = [
  { value: "4M+", label: "Freelancers" },
  { value: "12M+", label: "Projects Completed" },
  { value: "180+", label: "Countries" },
  { value: "$2B+", label: "Paid to Talent" },
]

const trustedBy = [
  "Microsoft",
  "Airbnb",
  "Stripe",
  "Notion",
  "Vercel",
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance">
            Find the perfect{" "}
            <span className="text-primary">freelance</span>{" "}
            talent for any project
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty">
            Connect with top independent professionals and agencies. Get quality work done faster with the world&apos;s largest freelancing marketplace.
          </p>

          {/* Search bar */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for any skill or service..."
                className="h-14 pl-12 pr-4 text-base bg-card border-border"
              />
            </div>
            <Button size="lg" className="h-14 px-8 text-base">
              Search
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Popular searches */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Popular:</span>
            {["Web Development", "UI/UX Design", "Mobile Apps", "AI/ML", "Marketing"].map((tag) => (
              <button
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold lg:text-4xl text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Trusted by */}
        <div className="mt-20">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trusted by leading companies
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-12 gap-y-4">
            {trustedBy.map((company) => (
              <div key={company} className="text-lg font-semibold text-muted-foreground/60">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
