import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { CATEGORIES } from "@/lib/categories";

export const metadata = { title: "Browse categories | Xwork" };

// A short, friendly blurb per category (original copy, no taglines lifted).
const BLURBS: Record<string, string> = {
  "Web Development": "Websites, web apps, APIs and everything in between.",
  "Mobile Development": "iOS, Android and cross-platform apps.",
  "Design & Creative": "Branding, UI/UX, illustration and visual design.",
  "Writing & Translation": "Copy, content, editing and localization.",
  "Marketing & Sales": "SEO, ads, social, email and growth.",
  "Data & Analytics": "Dashboards, pipelines, ML and insights.",
  "Admin & Customer Support": "Virtual assistants, ops and support.",
  "Video & Animation": "Editing, motion graphics and explainers.",
  "Music & Audio": "Production, mixing, voiceover and sound design.",
  "Finance & Accounting": "Bookkeeping, modeling and analysis.",
  "Engineering & Architecture": "CAD, 3D, structural and product design.",
  "Cybersecurity & IT": "Security, networking and systems work.",
  Other: "Everything else — describe what you need.",
};

const ICONS: Record<string, string> = {
  "Web Development": "🌐",
  "Mobile Development": "📱",
  "Design & Creative": "🎨",
  "Writing & Translation": "✍️",
  "Marketing & Sales": "📣",
  "Data & Analytics": "📊",
  "Admin & Customer Support": "🗂️",
  "Video & Animation": "🎬",
  "Music & Audio": "🎵",
  "Finance & Accounting": "💷",
  "Engineering & Architecture": "📐",
  "Cybersecurity & IT": "🔐",
  Other: "✨",
};

export default async function CategoriesPage() {
  const supabase = await createClient();

  // Live open-job count per category (one fetch, counted in memory).
  const { data: jobs } = await supabase
    .from("jobs")
    .select("category")
    .or("status.eq.open,status.is.null");
  const counts: Record<string, number> = {};
  for (const j of jobs ?? []) {
    const c = (j.category as string) || "Other";
    counts[c] = (counts[c] ?? 0) + 1;
  }

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-3xl font-bold text-foreground">
          Browse jobs by category
        </h1>
        <p className="text-muted-foreground mt-1 mb-8">
          Explore open work across every field on Xwork.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/jobs?category=${encodeURIComponent(cat)}`}
              className="group rounded-2xl border border-border bg-card p-5 hover:border-primary hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{ICONS[cat] ?? "📁"}</span>
                <span className="text-xs text-muted-foreground">
                  {counts[cat] ?? 0} open
                </span>
              </div>
              <h2 className="font-semibold text-foreground mt-3 group-hover:text-primary">
                {cat}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {BLURBS[cat] ?? "Browse open jobs in this category."}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
