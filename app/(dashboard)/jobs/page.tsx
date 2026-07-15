import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { FreelancerJobFeed } from "@/components/freelancer-job-feed";
import { CATEGORIES } from "@/lib/categories";
import { saveSearch, deleteSavedSearch } from "./search-actions";

type SearchParams = {
  q?: string;
  category?: string;
  experience_level?: string;
  min_budget?: string;
  saved?: string;
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Browsing the job feed requires an account (like Upwork — job search is
  // behind sign-in). A logged-out visitor who clicked a category/job on the
  // marketing home page is sent to log in / sign up, not dropped into the
  // freelancer feed. Individual job pages (/jobs/[id]) already require login.
  if (!user) redirect("/login");

  let query = supabase
    .from("jobs")
    .select("*, proposals(count), client:profiles!client_id(country, full_name, payment_verified, total_spent)")
    .or("status.eq.open,status.is.null")
    .order("created_at", { ascending: false });

  if (sp.q) {
    query = query.or(
      `title.ilike.%${sp.q}%,description.ilike.%${sp.q}%,skills.ilike.%${sp.q}%`
    );
  }
  if (sp.category) query = query.eq("category", sp.category);
  if (sp.experience_level)
    query = query.eq("experience_level", sp.experience_level);
  if (sp.min_budget) query = query.gte("budget", Number(sp.min_budget));

  const { data: jobs } = await query;

  let savedIds: string[] = [];
  let mySkills: string[] = [];
  const applied: Record<
    string,
    { id: string; status: string; contractId?: string | null }
  > = {};
  if (user) {
    const { data: savedRows } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", user.id);
    savedIds = (savedRows ?? []).map((r) => r.job_id as string);

    // Jobs this freelancer has an active (non-withdrawn) proposal on → drives
    // the "Applied" badge + "View Proposal" link on each card. Hired jobs also
    // resolve their contract so "View contract" opens the contract room.
    const { data: myProps } = await supabase
      .from("proposals")
      .select("id, job_id, status")
      .eq("freelancer_id", user.id)
      .neq("status", "withdrawn");
    const contractByJob: Record<string, string> = {};
    const { data: myContracts } = await supabase
      .from("contracts")
      .select("id, job_id")
      .eq("freelancer_id", user.id)
      .neq("status", "offer");
    for (const c of myContracts ?? []) {
      if (c.job_id) contractByJob[c.job_id as string] = c.id as string;
    }
    for (const p of myProps ?? []) {
      applied[p.job_id as string] = {
        id: p.id as string,
        status: p.status as string,
        contractId: contractByJob[p.job_id as string] ?? null,
      };
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("skills, categories")
      .eq("id", user.id)
      .maybeSingle();
    mySkills = [String(me?.skills || ""), String(me?.categories || "")]
      .join(",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // The user's saved searches (shown as removable chips).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedSearches: any[] = [];
  if (user) {
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    savedSearches = data ?? [];
  }

  // Does the user already have this exact search saved?
  const alreadySaved = savedSearches.some(
    (s) =>
      (s.query || "") === (sp.q || "") &&
      (s.category || "") === (sp.category || "") &&
      (s.experience_level || "") === (sp.experience_level || "")
  );
  const hasCriteria = !!(sp.q || sp.category || sp.experience_level || sp.min_budget);

  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Find work</h1>
        </div>

        {/* Search + category (full width, like Upwork) */}
        <form action="/jobs" method="get" className="mb-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 border border-border rounded-full bg-card px-5 py-3">
            <span className="text-muted-foreground">🔍</span>
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search for jobs"
              className="flex-1 bg-transparent text-foreground outline-none"
            />
          </div>
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            className="border border-border rounded-full bg-card px-5 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {sp.experience_level && (
            <input type="hidden" name="experience_level" value={sp.experience_level} />
          )}
          {sp.min_budget && (
            <input type="hidden" name="min_budget" value={sp.min_budget} />
          )}
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90"
          >
            Search
          </button>
        </form>

        {/* Save this search → powers "My Feed" */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {hasCriteria && !alreadySaved ? (
            <form action={saveSearch}>
              <input type="hidden" name="q" value={sp.q ?? ""} />
              <input type="hidden" name="category" value={sp.category ?? ""} />
              <input
                type="hidden"
                name="experience_level"
                value={sp.experience_level ?? ""}
              />
              <input type="hidden" name="min_budget" value={sp.min_budget ?? ""} />
              <button className="inline-flex items-center gap-1.5 border border-primary text-primary rounded-full px-4 py-1.5 text-sm font-medium hover:bg-primary/10">
                ♡ Save search
              </button>
            </form>
          ) : hasCriteria && alreadySaved ? (
            <span className="text-sm text-muted-foreground">✓ Search saved</span>
          ) : null}
          {sp.q || sp.category ? (
            <Link
              href="/jobs"
              className="text-sm text-muted-foreground hover:underline"
            >
              Clear
            </Link>
          ) : null}
          {sp.saved === "1" && (
            <span className="text-sm text-primary">
              Saved! It now appears in your My Feed.
            </span>
          )}
        </div>

        {/* Your saved searches */}
        {savedSearches.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">
              Your saved searches
            </p>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((s) => {
                const label =
                  [s.query, s.category].filter(Boolean).join(" · ") ||
                  "All jobs";
                const href = `/jobs?${new URLSearchParams({
                  ...(s.query ? { q: s.query } : {}),
                  ...(s.category ? { category: s.category } : {}),
                }).toString()}`;
                return (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-2 bg-secondary text-foreground rounded-full pl-3 pr-2 py-1 text-sm"
                  >
                    <Link href={href} className="hover:underline">
                      {label}
                    </Link>
                    <form action={deleteSavedSearch.bind(null, s.id)}>
                      <button
                        aria-label="Remove saved search"
                        className="text-muted-foreground hover:text-red-500"
                      >
                        ✕
                      </button>
                    </form>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-foreground mt-6 mb-4">
          Jobs you might like
        </h2>
        <FreelancerJobFeed
          jobs={jobs ?? []}
          savedIds={savedIds}
          mySkills={mySkills}
          applied={applied}
        />
      </div>
    </main>
  );
}
