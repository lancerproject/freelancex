import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { ProBadge } from "@/components/pro-badge";
import { getMembership } from "@/lib/membership";
import { talentBadgeMeta } from "@/lib/talent-badges";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRIES } from "@/lib/countries";
import { LANGUAGES, PROFICIENCY_LEVELS } from "@/lib/languages";
import { HIRE_CATEGORIES } from "@/lib/hire-skills";
import { suggestSkills } from "@/lib/skill-suggestions";

export const metadata = { title: "Search for talent | Xwork" };

// Upwork-style talent search. Matches any keyword (name, title, skill,
// category, language, location) and ranks results by real marketplace
// signals: keyword relevance, talent badge, Pro membership, Job Success,
// how actively the freelancer applies, how often clients view / shortlist
// their proposals, invites received, and lifetime earnings. 20 per page.

type SearchParams = {
  q?: string;
  category?: string;
  skill?: string | string[];
  location?: string;
  language?: string;
  english?: string;
  badge?: string | string[];
  jss?: string;
  earned?: string;
  page?: string;
};

const PAGE_SIZE = 20;

const BADGE_TIER: Record<string, number> = {
  top_rated_plus: 3,
  top_rated: 2,
  rising_talent: 1,
};

// Curated trending chips — general in-demand skills, never derived from any
// single freelancer's profile.
const TRENDING = [
  "Web Development",
  "Logo Design",
  "SEO",
  "Video Editing",
  "React",
  "Python",
  "Content Writing",
  "Graphic Design",
  "WordPress",
  "Data Entry",
];

function asList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.]+/u)
    .filter((w) => w.length > 1);
}

type Lang = { language: string; proficiency: string };

function toLangs(raw: unknown): Lang[] {
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => l && typeof l.language === "string");
  } catch {
    return [];
  }
}

function splitSkills(raw: unknown): string[] {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// "$7K+ earned" style figure, like Upwork.
function earnedLabel(n: number): string {
  if (n >= 1000) return `$${Math.floor(n / 1000)}K+ earned`;
  if (n >= 100) return `$${Math.floor(n / 100) * 100}+ earned`;
  if (n >= 1) return "$1+ earned";
  return "No earnings yet";
}

export default async function FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const q = (sp.q ?? "").trim();
  const words = tokenize(q);
  const category = (sp.category ?? "").trim();
  const locationQ = (sp.location ?? "").trim().toLowerCase();
  const languageQ = (sp.language ?? "").trim().toLowerCase();
  const englishMin = sp.english
    ? PROFICIENCY_LEVELS.findIndex((l) => l === sp.english)
    : -1;
  const badges = asList(sp.badge);
  const skillFilters = asList(sp.skill).map((s) => s.toLowerCase());
  const jssMin = sp.jss ? Number(sp.jss) : 0;

  // Service-role read: this page is public, and once personal columns are
  // revoked from the `anon` role a logged-out `select("*")` would fail. Only
  // public fields (name, title, skills, rate, badges) ever render.
  const admin = createAdminClient();
  const { data: freelancers } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "freelancer");

  // Respect profile visibility: never list "private" profiles; only list
  // "Xwork users only" profiles to signed-in viewers.
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const everyone = (freelancers ?? []).filter((f) => {
    const v = f.profile_visibility || "public";
    if (v === "private") return false;
    if (v === "users" && !viewer) return false;
    return true;
  });

  // ---- Marketplace signals (service role — aggregates only, no raw rows
  // ever reach the page) -----------------------------------------------------
  const earnedById: Record<string, number> = {};
  const applied30ById: Record<string, number> = {}; // proposals sent, last 30 days
  const viewedById: Record<string, number> = {}; // proposals a client opened
  const interviewsById: Record<string, number> = {}; // shortlisted or hired
  const invitesById: Record<string, number> = {}; // client invites received
  if (everyone.length > 0) {
    try {
      const ids = everyone.map((f) => f.id);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [pays, props, invs] = await Promise.all([
        admin
          .from("job_payments")
          .select("freelancer_id, gross_amount")
          .in("freelancer_id", ids),
        admin
          .from("proposals")
          .select("freelancer_id, status, viewed_at, created_at")
          .in("freelancer_id", ids),
        admin.from("invites").select("freelancer_id").in("freelancer_id", ids),
      ]);
      for (const p of pays.data ?? []) {
        earnedById[p.freelancer_id] =
          (earnedById[p.freelancer_id] ?? 0) + (Number(p.gross_amount) || 0);
      }
      for (const p of props.data ?? []) {
        const id = p.freelancer_id;
        if (p.created_at >= monthAgo && p.status !== "withdrawn") {
          applied30ById[id] = (applied30ById[id] ?? 0) + 1;
        }
        if (p.viewed_at) viewedById[id] = (viewedById[id] ?? 0) + 1;
        if (p.status === "shortlisted" || p.status === "accepted") {
          interviewsById[id] = (interviewsById[id] ?? 0) + 1;
        }
      }
      for (const i of invs.data ?? []) {
        invitesById[i.freelancer_id] = (invitesById[i.freelancer_id] ?? 0) + 1;
      }
    } catch {
      /* signals simply stay at 0 */
    }
  }

  // ---- Keyword matching: EVERY word must match name, title, skill, category,
  // language or location — so multi-word searches work. ----------------------
  function relevance(f: (typeof everyone)[number]): number {
    if (words.length === 0) return 1;
    const name = String(f.full_name || f.username || "").toLowerCase();
    const title = String(f.title || "").toLowerCase();
    const skills = splitSkills(f.skills).map((s) => s.toLowerCase());
    const skillsBlob = skills.join(" ");
    const cats = String(f.categories || "").toLowerCase();
    const place = `${f.location || ""} ${f.country || ""}`.toLowerCase();
    const langs = toLangs(f.languages)
      .map((l) => l.language.toLowerCase())
      .join(" ");

    let score = 0;
    for (const w of words) {
      let hit = 0;
      if (skills.some((s) => s === w)) hit = Math.max(hit, 6);
      else if (skillsBlob.includes(w)) hit = Math.max(hit, 3);
      if (name.includes(w)) hit = Math.max(hit, 5);
      if (title.includes(w)) hit = Math.max(hit, 3);
      if (cats.includes(w)) hit = Math.max(hit, 2);
      if (langs.includes(w) || place.includes(w)) hit = Math.max(hit, 1);
      if (hit === 0) return 0; // a word matched nothing → not a result
      score += hit;
    }
    return score;
  }

  // ---- Rank score: the marketplace signals the user asked for --------------
  function rankScore(f: (typeof everyone)[number]): number {
    let s = 0;
    s += (BADGE_TIER[f.talent_badge ?? ""] ?? 0) * 10; // badge tier
    if (getMembership(f).isPro) s += 15; // Pro users preferred
    s += Number(f.jss_score ?? 0) * 0.2; // Job Success (0–20)
    s += Math.min(15, (applied30ById[f.id] ?? 0)); // applying daily
    s += Math.min(10, (viewedById[f.id] ?? 0) * 2); // proposals viewed
    s += Math.min(20, (interviewsById[f.id] ?? 0) * 4); // interviews/hires
    s += Math.min(20, (invitesById[f.id] ?? 0) * 4); // client invites
    s += Math.min(15, (earnedById[f.id] ?? 0) / 500); // lifetime earnings
    return s;
  }

  let list = everyone
    .map((f) => ({ f, match: relevance(f) }))
    .filter((x) => x.match > 0);

  // ---- Filters --------------------------------------------------------------
  if (category) {
    const c = category.toLowerCase();
    list = list.filter((x) =>
      `${x.f.categories || ""} ${x.f.skills || ""} ${x.f.title || ""}`
        .toLowerCase()
        .includes(c)
    );
  }
  if (locationQ) {
    list = list.filter((x) =>
      `${x.f.location || ""} ${x.f.country || ""}`
        .toLowerCase()
        .includes(locationQ)
    );
  }
  if (languageQ) {
    list = list.filter((x) =>
      toLangs(x.f.languages).some((l) =>
        l.language.toLowerCase().includes(languageQ)
      )
    );
  }
  if (englishMin >= 0) {
    list = list.filter((x) => {
      const en = toLangs(x.f.languages).find(
        (l) => l.language.toLowerCase() === "english"
      );
      if (!en) return false;
      const lvl = PROFICIENCY_LEVELS.findIndex((p) => p === en.proficiency);
      return lvl >= englishMin;
    });
  }
  if (badges.length > 0) {
    list = list.filter((x) => badges.includes(x.f.talent_badge ?? ""));
  }
  if (jssMin > 0) {
    list = list.filter((x) => Number(x.f.jss_score ?? 0) >= jssMin);
  }
  if (sp.earned) {
    list = list.filter((x) => {
      const e = earnedById[x.f.id] ?? 0;
      if (sp.earned === "none") return e === 0;
      return e >= Number(sp.earned);
    });
  }

  // Skill checkboxes follow the SEARCH, not any freelancer's profile:
  // "game development" suggests game skills, "logo" suggests design skills,
  // empty search shows a general popular list. Applied with AND semantics.
  const skillOptions = suggestSkills([...words, ...tokenize(category)]);
  for (const s of skillFilters) {
    if (!skillOptions.some((o) => o.toLowerCase() === s)) skillOptions.push(s);
  }
  if (skillFilters.length > 0) {
    list = list.filter((x) => {
      const mine = String(x.f.skills || "").toLowerCase();
      return skillFilters.every((s) => mine.includes(s));
    });
  }

  // ---- Ranking: relevance first, then marketplace signals ------------------
  list.sort((a, b) => {
    const total =
      b.match * 5 + rankScore(b.f) - (a.match * 5 + rankScore(a.f));
    if (total !== 0) return total;
    return String(b.f.created_at ?? "").localeCompare(
      String(a.f.created_at ?? "")
    );
  });

  // ---- Pagination: 20 per page ----------------------------------------------
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)
  );
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(n: number): string {
    const params = new URLSearchParams();
    const entries: [string, string | string[] | undefined][] = [
      ["q", sp.q],
      ["category", sp.category],
      ["skill", sp.skill],
      ["location", sp.location],
      ["language", sp.language],
      ["english", sp.english],
      ["badge", sp.badge],
      ["jss", sp.jss],
      ["earned", sp.earned],
    ];
    for (const [key, v] of entries) {
      for (const one of asList(v)) params.append(key, one);
    }
    if (n > 1) params.set("page", String(n));
    const s = params.toString();
    return `/freelancers${s ? `?${s}` : ""}`;
  }

  // Compact page-number window: 1 … around current … last.
  const pageNumbers: number[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) {
      pageNumbers.push(n);
    }
  }

  // Location suggestions: countries + places freelancers actually wrote.
  const locationOptions = Array.from(
    new Set([
      ...everyone.map((f) => String(f.location || "").trim()).filter(Boolean),
      ...COUNTRIES,
    ])
  );

  const check = "w-4 h-4 accent-[var(--primary)]";
  const label = "flex items-center gap-2 text-sm text-foreground cursor-pointer";
  const heading = "text-sm font-semibold text-foreground mb-2";
  const textInput =
    "w-full bg-background border border-border text-foreground rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="min-h-screen px-4 lg:px-8 py-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Search for talent
      </h1>

      {/* ONE form: top search + every sidebar filter submit together. */}
      <form method="get">
        <div className="flex gap-3 max-w-2xl">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, title or skill…"
            className="flex-1 bg-background border border-border text-foreground p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-6 rounded-full font-medium hover:opacity-90"
          >
            Search
          </button>
        </div>

        {/* Trending skills — one click shows that talent. */}
        <div className="flex flex-wrap items-center gap-2 mt-4 mb-8">
          <span className="text-sm text-muted-foreground">Trending:</span>
          {TRENDING.map((s) => (
            <Link
              key={s}
              href={`/freelancers?q=${encodeURIComponent(s)}`}
              className={`text-xs rounded-full px-3 py-1.5 border transition ${
                q.toLowerCase() === s.toLowerCase()
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          {/* ---------------- Filters sidebar ---------------- */}
          <aside className="space-y-6 md:sticky md:top-24 self-start">
            <div>
              <p className={heading}>Category</p>
              <input
                name="category"
                list="category-options"
                placeholder="Type or pick a category"
                defaultValue={sp.category ?? ""}
                className={textInput}
              />
              <datalist id="category-options">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
                {HIRE_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>

            {skillOptions.length > 0 && (
              <div>
                <p className={heading}>Skills</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {skillOptions.map((s) => (
                    <label key={s} className={label}>
                      <input
                        type="checkbox"
                        name="skill"
                        value={s.toLowerCase()}
                        defaultChecked={skillFilters.includes(s.toLowerCase())}
                        className={check}
                      />
                      <span className="capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={heading}>Location</p>
              <input
                name="location"
                list="location-options"
                placeholder="City, country or region"
                defaultValue={sp.location ?? ""}
                className={textInput}
              />
              <datalist id="location-options">
                {locationOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <p className={heading}>Language</p>
              <input
                name="language"
                list="language-options"
                placeholder="e.g. English, Urdu, Spanish"
                defaultValue={sp.language ?? ""}
                className={textInput}
              />
              <datalist id="language-options">
                {LANGUAGES.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            <div>
              <p className={heading}>English level</p>
              <div className="space-y-1.5">
                <label className={label}>
                  <input
                    type="radio"
                    name="english"
                    value=""
                    defaultChecked={!sp.english}
                    className={check}
                  />
                  Any level
                </label>
                {PROFICIENCY_LEVELS.map((p) => (
                  <label key={p} className={label}>
                    <input
                      type="radio"
                      name="english"
                      value={p}
                      defaultChecked={sp.english === p}
                      className={check}
                    />
                    {p}
                    {p !== "Native or Bilingual" ? " & up" : ""}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className={heading}>Talent badge</p>
              <div className="space-y-1.5">
                {(
                  [
                    ["top_rated_plus", "💎 Top Rated Plus"],
                    ["top_rated", "🏆 Top Rated"],
                    ["rising_talent", "🌱 Rising Talent"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className={label}>
                    <input
                      type="checkbox"
                      name="badge"
                      value={v}
                      defaultChecked={badges.includes(v)}
                      className={check}
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className={heading}>Job success</p>
              <div className="space-y-1.5">
                {(
                  [
                    ["", "Any job success"],
                    ["80", "80% & up"],
                    ["90", "90% & up"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v || "any"} className={label}>
                    <input
                      type="radio"
                      name="jss"
                      value={v}
                      defaultChecked={(sp.jss ?? "") === v}
                      className={check}
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className={heading}>Earned amount</p>
              <div className="space-y-1.5">
                {(
                  [
                    ["", "Any amount earned"],
                    ["1", "$1+ earned"],
                    ["100", "$100+ earned"],
                    ["1000", "$1K+ earned"],
                    ["10000", "$10K+ earned"],
                    ["none", "No earnings yet"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v || "any"} className={label}>
                    <input
                      type="radio"
                      name="earned"
                      value={v}
                      defaultChecked={(sp.earned ?? "") === v}
                      className={check}
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-medium hover:opacity-90"
            >
              Apply filters
            </button>
            <Link
              href="/freelancers"
              className="block text-center text-sm text-muted-foreground hover:underline"
            >
              Clear filters
            </Link>
          </aside>

          {/* ---------------- Results (ranked) ---------------- */}
          <section>
            <p className="text-sm text-muted-foreground mb-4">
              {list.length} freelancer{list.length === 1 ? "" : "s"}
              {q ? ` for “${q}”` : ""}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
            </p>

            <div className="space-y-4">
              {pageItems.map(({ f }) => {
                const initials = (f.full_name || f.email || "?")
                  .slice(0, 1)
                  .toUpperCase();
                const badge = talentBadgeMeta(f.talent_badge);
                const jss =
                  f.jss_score != null ? Math.round(Number(f.jss_score)) : null;
                const earned = earnedById[f.id] ?? 0;
                const skills = splitSkills(f.skills);

                return (
                  <div
                    key={f.id}
                    className="rounded-2xl border border-border bg-card p-5 flex gap-4"
                  >
                    <div className="shrink-0">
                      {f.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.avatar_url}
                          alt={f.full_name ?? "avatar"}
                          className="w-14 h-14 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/profile/${f.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {f.full_name || f.username || "Unnamed"}
                        </Link>
                        {getMembership(f).isPro && <ProBadge size="sm" />}
                        {f.id_verified && (
                          <span
                            title="Identity verified"
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px]"
                          >
                            ✓
                          </span>
                        )}
                        {badge && (
                          <span
                            title={badge.title}
                            className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-semibold ${badge.className}`}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        )}
                      </span>
                      {f.title && (
                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                          {f.title}
                        </p>
                      )}
                      {(f.country || f.location) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.country || f.location}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm">
                        {jss != null && (
                          <span className="text-foreground">
                            <span className="text-primary">◉</span> {jss}% Job
                            Success
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {earnedLabel(earned)}
                        </span>
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {skills.slice(0, 6).map((skill: string) => (
                            <span
                              key={skill}
                              className="text-xs bg-secondary rounded-full px-2.5 py-1 text-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                          {skills.length > 6 && (
                            <span className="text-xs bg-secondary rounded-full px-2.5 py-1 text-muted-foreground">
                              +{skills.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <Link
                        href={`/profile/${f.id}`}
                        className="inline-block border border-primary text-primary px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/10"
                      >
                        View profile
                      </Link>
                    </div>
                  </div>
                );
              })}

              {list.length === 0 && (
                <div className="text-center text-muted-foreground py-16 border border-border rounded-2xl">
                  No freelancers match your search. Try different keywords or
                  clear some filters.
                </div>
              )}
            </div>

            {/* ---------------- Pagination ---------------- */}
            {totalPages > 1 && (
              <nav
                aria-label="Pages"
                className="flex items-center justify-center gap-1.5 mt-8 flex-wrap"
              >
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-secondary"
                  >
                    ← Previous
                  </Link>
                )}
                {pageNumbers.map((n, i) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {i > 0 && pageNumbers[i - 1] !== n - 1 && (
                      <span className="text-muted-foreground px-1">…</span>
                    )}
                    <Link
                      href={pageHref(n)}
                      aria-current={n === page ? "page" : undefined}
                      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm ${
                        n === page
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "border border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      {n}
                    </Link>
                  </span>
                ))}
                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-secondary"
                  >
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
      </form>
    </main>
  );
}
