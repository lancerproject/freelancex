"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toggleSaveJobQuiet } from "@/app/saved/actions";
import { saveSearch } from "@/app/(dashboard)/jobs/search-actions";
import { getJobPanelData } from "@/app/(dashboard)/jobs/client-actions";
import { OtherOpenJobs } from "@/components/other-open-jobs";
import { CopyLink } from "@/components/copy-link";
import { proposalsBucket } from "@/lib/proposals";
import { talentLocationLabel } from "@/lib/job-location";
import { JobActivity } from "@/components/job-activity";
import { proposalStatusLabel } from "@/lib/proposal-status";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Job = any;

type SavedSearch = {
  id: string;
  query?: string | null;
  category?: string | null;
  experience_level?: string | null;
  min_budget?: number | null;
};

// Does a job match a saved search? All set criteria must match.
function matchesSearch(job: Job, s: SavedSearch) {
  if (s.category && job.category !== s.category) return false;
  if (s.experience_level && job.experience_level !== s.experience_level)
    return false;
  if (s.min_budget != null && Number(job.budget || 0) < Number(s.min_budget))
    return false;
  if (s.query) {
    const hay = `${job.title || ""} ${job.description || ""} ${
      job.skills || ""
    }`.toLowerCase();
    const toks = String(s.query).toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.every((t) => hay.includes(t))) return false;
  }
  return true;
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Posted just now";
  if (mins < 60) return `Posted ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `Posted ${months} month${months === 1 ? "" : "s"} ago`;
}

// Highlight the searched terms inside a piece of text (like Upwork does in
// its results). Returns React nodes with the matches wrapped in a <mark>.
function highlight(text: string, query: string): React.ReactNode {
  const q = (query || "").trim();
  if (!q || !text) return text;
  const toks = q.split(/\s+/).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!toks.length) return text;
  const re = new RegExp(`(${toks.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) && toks.some((t) => new RegExp(`^${t}$`, "i").test(p)) ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function FreelancerJobFeed({
  jobs,
  savedIds,
  mySkills = [],
  personalized = false,
  savedSearches = [],
  applied = {},
  searchQuery = "",
}: {
  jobs: Job[];
  savedIds: string[];
  mySkills?: string[];
  searchQuery?: string;
  // When true (the dashboard "Jobs you might like"), the feed shows ONLY jobs
  // relevant to the freelancer's category/skills. When false (the search
  // page), all results are shown, with the best matches ranked first.
  personalized?: boolean;
  // The freelancer's saved searches — these power the "My Feed" tab.
  savedSearches?: SavedSearch[];
  // Jobs the freelancer has an active proposal on: jobId → { proposalId, status,
  // contractId }. Drives the "Applied"/"Hired" badge, the "View Proposal" link,
  // and (once hired) the "View contract" link on each card.
  applied?: Record<
    string,
    { id: string; status: string; contractId?: string | null }
  >;
}) {
  const myTokens = useMemo(
    () => mySkills.map((s) => s.toLowerCase().trim()).filter(Boolean),
    [mySkills]
  );
  const hasSkills = myTokens.length > 0;
  // "My Feed" only appears once the freelancer has saved at least one search.
  const hasSavedSearches = savedSearches.length > 0;
  const TABS = [
    "Best Matches",
    ...(hasSavedSearches ? ["My Feed"] : []),
    "All recent jobs",
    "Saved Jobs",
  ];

  const [tab, setTab] = useState<string>("Best Matches");
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds));
  // Disliked jobs collapse in place (showing the reason + an Expand link),
  // exactly like Upwork — they are NOT removed from the feed.
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [dislikeFor, setDislikeFor] = useState<string | null>(null);
  const DISLIKE_REASONS = [
    "Just not interested",
    "Vague description",
    "Unrealistic expectations",
    "Too many applicants",
    "Job posted too long ago",
    "Poor reviews about the client",
    "Doesn't match skills",
    "I am overqualified",
    "Budget too low",
    "Not in my preferred location",
  ];
  const [selected, setSelected] = useState<Job | null>(null);
  const [, startTransition] = useTransition();

  // Advanced filters (the "Filters" modal).
  const [showFilters, setShowFilters] = useState(false);
  const [expFilter, setExpFilter] = useState<Set<string>>(new Set());
  const [propFilter, setPropFilter] = useState<Set<string>>(new Set());
  const [clientFilter, setClientFilter] = useState<Set<string>>(new Set());
  const [budgetFilter, setBudgetFilter] = useState<Set<string>>(new Set());
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const filterCount =
    expFilter.size +
    propFilter.size +
    clientFilter.size +
    budgetFilter.size +
    catFilter.size;
  const toggleIn = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    val: string
  ) =>
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(val)) n.delete(val);
      else n.add(val);
      return n;
    });
  const clearFilters = () => {
    setExpFilter(new Set());
    setPropFilter(new Set());
    setClientFilter(new Set());
    setBudgetFilter(new Set());
    setCatFilter(new Set());
  };
  // Fixed-price budget buckets (mirrors Upwork's price-range filter).
  const budgetBucket = (n: number) => {
    if (n < 100) return "Less than $100";
    if (n < 500) return "$100 to $500";
    if (n < 1000) return "$500 to $1K";
    if (n < 5000) return "$1K to $5K";
    return "$5K+";
  };
  const countOf = (j: Job) =>
    Array.isArray(j.proposals) ? j.proposals[0]?.count ?? 0 : 0;
  const clientOf = (j: Job) => (Array.isArray(j.client) ? j.client[0] : j.client);

  // Coarse buckets used only by the advanced filter (keeps the filter list
  // short). The displayed per-job count uses the fine `proposalsBucket` import.
  const filterBucket = (n: number) => {
    if (n < 5) return "Less than 5";
    if (n < 10) return "5 to 10";
    if (n < 20) return "10 to 20";
    return "20 to 50";
  };

  // Sort dropdown (Upwork parity): Best matches vs Newest.
  const [sort, setSort] = useState<"best" | "newest">("best");

  // Result counts shown next to each filter option (like Upwork's sidebar).
  const counts = useMemo(() => {
    const open = jobs.filter((j) => countOf(j) < 50);
    const exp: Record<string, number> = {};
    const prop: Record<string, number> = {};
    const bud: Record<string, number> = {};
    const cat: Record<string, number> = {};
    let newClients = 0;
    let hiredClients = 0;
    for (const j of open) {
      if (j.experience_level)
        exp[j.experience_level] = (exp[j.experience_level] || 0) + 1;
      if (j.category) cat[j.category] = (cat[j.category] || 0) + 1;
      const pb = filterBucket(countOf(j));
      prop[pb] = (prop[pb] || 0) + 1;
      const bb = budgetBucket(Number(j.budget) || 0);
      bud[bb] = (bud[bb] || 0) + 1;
      if ((Number(clientOf(j)?.total_spent) || 0) === 0) newClients++;
      else hiredClients++;
    }
    return { exp, prop, bud, cat, newClients, hiredClients, total: open.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const toggleSave = (jobId: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
    startTransition(() => {
      toggleSaveJobQuiet(jobId);
    });
  };

  const list = useMemo(() => {
    let base = [...jobs];
    if (tab === "Saved Jobs") {
      base = base.filter((j) => saved.has(j.id));
    } else {
      // A job stops showing in the feed once it hits 50 applicants
      // (first come, first served — no more proposals accepted).
      base = base.filter((j) => countOf(j) < 50);
      // Advanced filters (apply to Best Matches & My Feed)
      if (expFilter.size) {
        base = base.filter((j) => expFilter.has(j.experience_level));
      }
      if (propFilter.size) {
        base = base.filter((j) => propFilter.has(filterBucket(countOf(j))));
      }
      if (clientFilter.size) {
        base = base.filter((j) => {
          const spent = Number(clientOf(j)?.total_spent) || 0;
          const isNew = spent === 0;
          return (
            (clientFilter.has("new") && isNew) ||
            (clientFilter.has("hires") && !isNew)
          );
        });
      }
      if (budgetFilter.size) {
        base = base.filter((j) =>
          budgetFilter.has(budgetBucket(Number(j.budget) || 0))
        );
      }
      if (catFilter.size) {
        base = base.filter((j) => catFilter.has(j.category));
      }

      const matchScore = (job: Job) => {
        if (!hasSkills) return 0;
        const hay = `${job.skills || ""} ${job.category || ""} ${
          job.title || ""
        }`.toLowerCase();
        return myTokens.filter((t) => hay.includes(t)).length;
      };

      if (tab === "My Feed") {
        // Jobs matching ANY of your saved searches, newest first.
        if (savedSearches.length) {
          base = base.filter((j) =>
            savedSearches.some((s) => matchesSearch(j, s))
          );
        }
        base = [...base].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else if (tab === "All recent jobs") {
        // Everything mixed — every category, new & old, payment verified or
        // not, regardless of skills — newest first. Shown to all users.
        base = [...base].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        // Best Matches — jobs matched to the freelancer's profile
        // categories + skills.
        if (personalized && !hasSkills) {
          // No categories/skills set → nothing to match on. Leave Best Matches
          // empty; the empty state points the user to "All recent jobs".
          base = [];
        } else if (hasSkills) {
          // Dashboard: show ONLY relevant jobs. Search page: keep all results
          // but rank the best matches first.
          if (personalized) base = base.filter((j) => matchScore(j) > 0);
          // Rank by relevance, then newest-first within the same relevance so
          // fresh jobs always surface promptly (timely).
          base = [...base].sort((a, b) => {
            const d = matchScore(b) - matchScore(a);
            if (d !== 0) return d;
            return (
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        } else {
          // Search page with no skills set → show everything, newest first.
          base = [...base].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      }
    }
    // Sort dropdown override (applies within the current tab).
    if (tab !== "Saved Jobs" && sort === "newest") {
      base = [...base].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, jobs, saved, myTokens, hasSkills, personalized, savedSearches, expFilter, propFilter, clientFilter, budgetFilter, catFilter, sort]);

  // Left filter sidebar (Upwork-style) — used on the search page, with a live
  // result count next to each option.
  const sidebar = (
    <div className="space-y-1">
      {Object.keys(counts.cat).length > 0 && (
        <FilterGroup title="Category">
          {Object.entries(counts.cat)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([c, n]) => (
              <CheckRow
                key={c}
                label={`${c} (${n})`}
                checked={catFilter.has(c)}
                onChange={() => toggleIn(setCatFilter, c)}
              />
            ))}
        </FilterGroup>
      )}
      <FilterGroup title="Experience level">
        {[
          ["entry", "Entry level"],
          ["intermediate", "Intermediate"],
          ["expert", "Expert"],
        ].map(([v, l]) => (
          <CheckRow
            key={v}
            label={`${l}${counts.exp[v] ? ` (${counts.exp[v]})` : ""}`}
            checked={expFilter.has(v)}
            onChange={() => toggleIn(setExpFilter, v)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Project budget">
        {["Less than $100", "$100 to $500", "$500 to $1K", "$1K to $5K", "$5K+"].map(
          (b) => (
            <CheckRow
              key={b}
              label={`${b}${counts.bud[b] ? ` (${counts.bud[b]})` : ""}`}
              checked={budgetFilter.has(b)}
              onChange={() => toggleIn(setBudgetFilter, b)}
            />
          )
        )}
      </FilterGroup>
      <FilterGroup title="Number of proposals">
        {["Less than 5", "5 to 10", "10 to 20", "20 to 50"].map((b) => (
          <CheckRow
            key={b}
            label={`${b}${counts.prop[b] ? ` (${counts.prop[b]})` : ""}`}
            checked={propFilter.has(b)}
            onChange={() => toggleIn(setPropFilter, b)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Client history">
        <CheckRow
          label={`No hires (new client)${counts.newClients ? ` (${counts.newClients})` : ""}`}
          checked={clientFilter.has("new")}
          onChange={() => toggleIn(setClientFilter, "new")}
        />
        <CheckRow
          label={`Has hired before${counts.hiredClients ? ` (${counts.hiredClients})` : ""}`}
          checked={clientFilter.has("hires")}
          onChange={() => toggleIn(setClientFilter, "hires")}
        />
      </FilterGroup>
      {filterCount > 0 && (
        <button
          onClick={clearFilters}
          className="text-sm text-primary hover:underline mt-3"
        >
          Clear filters ({filterCount})
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div
        className={
          personalized ? "" : "lg:grid lg:grid-cols-[250px_1fr] lg:gap-8"
        }
      >
        {/* Persistent filter sidebar on the search page (desktop) */}
        {!personalized && (
          <aside className="hidden lg:block">
            <h3 className="font-bold text-foreground mb-1">Filters</h3>
            {sidebar}
          </aside>
        )}

        <div className="min-w-0">
          {/* Tabs + Sort + (mobile) Filters */}
          <div className="flex items-center justify-between border-b border-border gap-3">
            <div className="flex gap-6 text-sm overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-3 border-b-2 -mb-px transition whitespace-nowrap ${
                    tab === t
                      ? "border-foreground text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "Saved Jobs" && saved.size > 0
                    ? `Saved Jobs (${saved.size})`
                    : t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Save this search → it powers the "My Feed" tab (Upwork parity) */}
              {!personalized &&
                (searchQuery || catFilter.size > 0 || expFilter.size > 0) && (
                  <form action={saveSearch}>
                    <input type="hidden" name="q" value={searchQuery} />
                    <input
                      type="hidden"
                      name="category"
                      value={Array.from(catFilter)[0] || ""}
                    />
                    <input
                      type="hidden"
                      name="experience_level"
                      value={Array.from(expFilter)[0] || ""}
                    />
                    <input type="hidden" name="min_budget" value="" />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 text-sm border border-primary text-primary rounded-full px-3 py-1.5 hover:bg-primary/10 whitespace-nowrap"
                    >
                      ♡ Save search
                    </button>
                  </form>
                )}
              {!personalized && (
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "best" | "newest")}
                  aria-label="Sort jobs"
                  className="text-sm border border-border rounded-full px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="best">Sort: Best matches</option>
                  <option value="newest">Sort: Newest</option>
                </select>
              )}
              <button
                onClick={() => setShowFilters(true)}
                className={`flex items-center gap-2 text-sm border border-border rounded-full px-4 py-1.5 text-foreground hover:bg-secondary ${
                  personalized ? "" : "lg:hidden"
                }`}
              >
                <span>⚙</span> Filters
                {filterCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                    {filterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

      <p className="text-sm text-muted-foreground mt-4 mb-2">
        {tab === "Saved Jobs"
          ? "Jobs you've saved for later."
          : tab === "My Feed"
          ? "Only jobs that match the skills on your profile."
          : hasSkills
          ? "All open jobs — the ones matching your skills are shown first."
          : "Browse open jobs. Add skills to your profile to get matched jobs."}
      </p>

      <div className="divide-y divide-border border-t border-border">
        {list.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {tab === "Saved Jobs"
              ? "You haven't saved any jobs yet."
              : hasSkills
              ? "No jobs match your skills yet. Check back soon."
              : "No jobs to show right now."}
          </div>
        )}

        {list.map((job) => {
          const skills =
            typeof job.skills === "string"
              ? job.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
              : Array.isArray(job.skills)
              ? job.skills
              : [];
          const isSaved = saved.has(job.id);
          const propCount = Array.isArray(job.proposals)
            ? job.proposals[0]?.count ?? 0
            : 0;
          const client = Array.isArray(job.client)
            ? job.client[0]
            : job.client;
          const country = client?.country;
          const paymentVerified = !!client?.payment_verified;
          const spent = Number(client?.total_spent) || 0;
          const dismissReason = dismissed[job.id];

          // Collapsed (disliked) card — title dimmed + reason + Expand to undo.
          if (dismissReason) {
            return (
              <div key={job.id} className="py-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs bg-primary/10 text-foreground rounded px-2 py-1">
                    {timeAgo(job.created_at)}
                  </span>
                  <button
                    onClick={() =>
                      setDismissed((d) => {
                        const n = { ...d };
                        delete n[job.id];
                        return n;
                      })
                    }
                    className="text-sm font-medium text-primary hover:underline shrink-0"
                  >
                    Expand
                  </button>
                </div>
                <p className="text-lg font-semibold text-muted-foreground/70 mt-2">
                  {job.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dismissReason}
                </p>
              </div>
            );
          }

          return (
            <div key={job.id} className="py-6">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs bg-primary/10 text-foreground rounded px-2 py-1">
                  {timeAgo(job.created_at)}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setDislikeFor((cur) => (cur === job.id ? null : job.id))
                      }
                      aria-label="Not interested"
                      aria-expanded={dislikeFor === job.id}
                      className={`text-lg leading-none hover:text-foreground ${
                        dislikeFor === job.id
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                      title="Not interested"
                    >
                      👎
                    </button>
                    {dislikeFor === job.id && (
                      <>
                        {/* click-away */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setDislikeFor(null)}
                        />
                        <div className="absolute right-0 top-8 z-50 w-72 bg-card border border-border rounded-xl shadow-lg py-2 text-left">
                          {DISLIKE_REASONS.map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                setDismissed((d) => ({ ...d, [job.id]: r }));
                                setDislikeFor(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary"
                            >
                              {r}
                            </button>
                          ))}
                          <p className="px-4 pt-2 mt-1 border-t border-border text-xs text-muted-foreground">
                            The client will not be notified. Your feedback helps
                            us improve job search.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => toggleSave(job.id)}
                    aria-label="Save job"
                    className={`text-xl leading-none ${
                      isSaved
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isSaved ? "♥" : "♡"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(job)}
                className="block text-left text-lg font-semibold text-foreground hover:text-primary mt-2"
              >
                {highlight(job.title, searchQuery)}
              </button>

              {/* "Applied"/"Hired" badge — persists (DB-backed via the
                  `applied` map) across refreshes/sessions/devices. Once hired,
                  the proposal links are replaced by the contract room. */}
              {applied[job.id] &&
                (applied[job.id].status === "accepted" ? (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-600/15 text-green-700 rounded-full px-2.5 py-1">
                      🎉 Hired
                    </span>
                    <Link
                      href={
                        applied[job.id].contractId
                          ? `/contracts/${applied[job.id].contractId}`
                          : "/contracts"
                      }
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View contract
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/15 text-primary rounded-full px-2.5 py-1">
                      ✓ Applied
                      {applied[job.id].status !== "pending" &&
                        ` · ${proposalStatusLabel(applied[job.id].status)}`}
                    </span>
                    <Link
                      href={`/proposals/${applied[job.id].id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View proposal
                    </Link>
                  </div>
                ))}

              <p className="text-sm text-muted-foreground mt-1">
                Fixed-price
                {job.experience_level ? ` · ${job.experience_level}` : ""} · Est.
                budget: ${job.budget}
              </p>

              {job.description && (
                <p className="text-sm text-foreground/80 mt-3 line-clamp-3">
                  {highlight(job.description, searchQuery)}
                </p>
              )}

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.slice(0, 6).map((s: string) => (
                    <span
                      key={s}
                      className="text-xs bg-secondary text-foreground rounded-full px-3 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Client info row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className={
                      paymentVerified ? "text-primary" : "text-muted-foreground"
                    }
                  >
                    {paymentVerified ? "✓" : "○"}
                  </span>
                  Payment {paymentVerified ? "verified" : "not verified"}
                </span>
                <span>{spent > 0 ? `$${spent} spent` : "New client"}</span>
                <span className="text-primary font-medium">
                  Proposals: {proposalsBucket(propCount)}
                </span>
                {country && <span>📍 {country}</span>}
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-foreground font-medium">
              {tab === "Saved Jobs"
                ? "You haven't saved any jobs yet."
                : tab === "My Feed"
                ? "No new jobs match your saved searches yet."
                : tab === "All recent jobs"
                ? "No jobs have been posted yet."
                : personalized && !hasSkills
                ? "Set your categories and skills to see jobs matched to you."
                : personalized && hasSkills
                ? "No jobs match your skills right now."
                : "No jobs found."}
            </p>
            {personalized && tab === "Best Matches" && (
              <p className="text-sm text-muted-foreground mt-2">
                {hasSkills
                  ? "Add more skills to your profile, or "
                  : "Set your categories in your profile, or "}
                <button
                  type="button"
                  onClick={() => setTab("All recent jobs")}
                  className="text-primary hover:underline"
                >
                  see all recent jobs
                </button>
                .
              </p>
            )}
          </div>
        )}
      </div>

        </div>
      </div>

      {/* Slide-in job details panel (like Upwork) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelected(null)}
          />
          <div className="relative bg-card w-full max-w-5xl lg:max-w-6xl h-full overflow-y-auto shadow-2xl">
            <JobPanel
              job={selected}
              isSaved={saved.has(selected.id)}
              onToggleSave={() => toggleSave(selected.id)}
              onClose={() => setSelected(null)}
              proposalsBucket={proposalsBucket}
              appliedInfo={applied[selected.id]}
            />
          </div>
        </div>
      )}

      {showFilters && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-foreground">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Filters apply to Best Matches and My Feed.
            </p>

            {Object.keys(counts.cat).length > 0 && (
              <FilterGroup title="Category">
                {Object.entries(counts.cat)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([c, n]) => (
                    <CheckRow
                      key={c}
                      label={`${c} (${n})`}
                      checked={catFilter.has(c)}
                      onChange={() => toggleIn(setCatFilter, c)}
                    />
                  ))}
              </FilterGroup>
            )}

            <FilterGroup title="Experience level">
              {[
                ["entry", "Entry level"],
                ["intermediate", "Intermediate"],
                ["expert", "Expert"],
              ].map(([v, l]) => (
                <CheckRow
                  key={v}
                  label={l}
                  checked={expFilter.has(v)}
                  onChange={() => toggleIn(setExpFilter, v)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Number of proposals">
              {["Less than 5", "5 to 10", "10 to 20", "20 to 50"].map(
                (b) => (
                  <CheckRow
                    key={b}
                    label={b}
                    checked={propFilter.has(b)}
                    onChange={() => toggleIn(setPropFilter, b)}
                  />
                )
              )}
            </FilterGroup>

            <FilterGroup title="Client history">
              <CheckRow
                label="No hires (new client)"
                checked={clientFilter.has("new")}
                onChange={() => toggleIn(setClientFilter, "new")}
              />
              <CheckRow
                label="Has hired before"
                checked={clientFilter.has("hires")}
                onChange={() => toggleIn(setClientFilter, "hires")}
              />
            </FilterGroup>

            <FilterGroup title="Project budget">
              {[
                "Less than $100",
                "$100 to $500",
                "$500 to $1K",
                "$1K to $5K",
                "$5K+",
              ].map((b) => (
                <CheckRow
                  key={b}
                  label={b}
                  checked={budgetFilter.has(b)}
                  onChange={() => toggleIn(setBudgetFilter, b)}
                />
              ))}
            </FilterGroup>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobPanel({
  job,
  isSaved,
  onToggleSave,
  onClose,
  proposalsBucket,
  appliedInfo,
}: {
  job: Job;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  proposalsBucket: (n: number) => string;
  appliedInfo?: { id: string; status: string; contractId?: string | null };
}) {
  const skills =
    typeof job.skills === "string"
      ? job.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(job.skills)
      ? job.skills
      : [];
  const client = Array.isArray(job.client) ? job.client[0] : job.client;
  const country = client?.country;
  const talentLoc = talentLocationLabel(job);
  const paymentVerified = !!client?.payment_verified;
  const spent = Number(client?.total_spent) || 0;
  const propCount = Array.isArray(job.proposals)
    ? job.proposals[0]?.count ?? 0
    : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [info, setInfo] = useState<any>(null);
  const [extras, setExtras] = useState<{
    bidRange: { high: number; avg: number; low: number } | null;
    bidLocked?: boolean;
    otherJobs: { id: string; title: string; budget: number | null }[];
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activity, setActivity] = useState<any>(null);
  // One combined fetch per job (client info + bid range + other jobs in a
  // single server round-trip). The ref dedupes React Strict Mode's double
  // effect run AND discards stale responses when switching jobs.
  const panelJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job.client_id) return;
    if (panelJobRef.current === job.id) return; // already loading/loaded
    panelJobRef.current = job.id;
    setInfo(null);
    setExtras(null);
    setActivity(null);

    const thisJob = job.id;
    const load = (attempt = 0) => {
      getJobPanelData(thisJob, job.client_id)
        .then((r) => {
          if (panelJobRef.current !== thisJob) return; // switched jobs
          setInfo(r.info);
          setExtras(r.extras);
          setActivity(r.activity);
        })
        .catch(() => {
          if (panelJobRef.current !== thisJob) return;
          if (attempt < 1) setTimeout(() => load(1), 1500);
          // Never leave the panel empty if the lookup keeps failing.
          else setExtras({ bidRange: null, bidLocked: true, otherJobs: [] });
        });
    };
    load();
  }, [job.id, job.client_id]);

  const memberSince = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="text-foreground hover:text-primary flex items-center gap-2 text-sm"
        >
          ← Back
        </button>
        <Link
          href={`/jobs/${job.id}`}
          target="_blank"
          className="text-primary text-sm font-medium hover:underline"
        >
          Open job in a new window ↗
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">
        {/* Main */}
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
          {appliedInfo &&
            (appliedInfo.status === "accepted" ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-600/15 text-green-700 rounded-full px-2.5 py-1">
                  🎉 Hired
                </span>
                <Link
                  href={
                    appliedInfo.contractId
                      ? `/contracts/${appliedInfo.contractId}`
                      : "/contracts"
                  }
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View contract
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/15 text-primary rounded-full px-2.5 py-1">
                  ✓ Applied
                  {appliedInfo.status !== "pending" &&
                    ` · ${proposalStatusLabel(appliedInfo.status)}`}
                </span>
                <Link
                  href={`/proposals/${appliedInfo.id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View proposal
                </Link>
              </div>
            ))}
          <p className="text-sm text-muted-foreground mt-2">
            {timeAgo(job.created_at)} · 📍 {talentLoc}
          </p>

          <hr className="my-5 border-border" />

          {job.description && (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Summary
              </h3>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-6 mt-6 text-sm">
            <div>
              <p className="font-semibold text-foreground">${job.budget}</p>
              <p className="text-muted-foreground">Fixed-price</p>
            </div>
            {job.experience_level && (
              <div>
                <p className="font-semibold text-foreground capitalize">
                  {job.experience_level}
                </p>
                <p className="text-muted-foreground">Experience level</p>
              </div>
            )}
          </div>

          {skills.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Skills and expertise
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s: string) => (
                  <span
                    key={s}
                    className="text-sm bg-secondary text-foreground rounded-full px-3 py-1"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activity on this job — live counts */}
          <div className="mt-8 border-t border-border pt-5">
            <h3 className="text-lg font-bold text-foreground mb-3">
              Activity on this job
            </h3>
            <JobActivity
              // Remount with the real counts once the combined panel fetch
              // returns, so we don't fire a second server action on open.
              key={activity ? "loaded" : "loading"}
              jobId={job.id}
              refreshOnMount={false}
              initial={
                activity ?? {
                  proposals: propCount,
                  interviewing: 0,
                  invitesSent: 0,
                  unanswered: 0,
                  hired: 0,
                }
              }
            />
            {!extras && (
              <p className="text-sm text-muted-foreground mt-4">
                Bid range: <span className="animate-pulse">loading…</span>
              </p>
            )}
            {extras &&
              (extras.bidLocked || !extras.bidRange ? (
                <p className="text-sm text-muted-foreground mt-4">
                  Bid range:{" "}
                  <span className="text-foreground blur-sm select-none" aria-hidden>
                    $––– to $–––
                  </span>{" "}
                  <a
                    href="/settings/membership"
                    className="text-primary hover:underline font-medium"
                  >
                    Upgrade to Pro to see the bid range from other users
                  </a>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-4">
                  Bid range:{" "}
                  <span className="text-foreground font-bold">
                    High ${extras.bidRange.high.toFixed(2)} · Avg $
                    {extras.bidRange.avg.toFixed(2)} · Low $
                    {extras.bidRange.low.toFixed(2)}
                  </span>
                </p>
              ))}
          </div>
        </div>

        {/* Right actions + client. The Apply button reflects reality: purple
            only while you can still apply — gray once applied, and replaced by
            "View contract" once the client hires you. */}
        <aside className="space-y-4">
          {appliedInfo?.status === "accepted" ? (
            <Link
              href={
                appliedInfo.contractId
                  ? `/contracts/${appliedInfo.contractId}`
                  : "/contracts"
              }
              className="block text-center bg-green-600 text-white rounded-full py-2.5 font-semibold hover:opacity-90"
            >
              🎉 Hired — View contract
            </Link>
          ) : appliedInfo ? (
            <>
              <span
                className="block text-center bg-neutral-200 text-neutral-500 rounded-full py-2.5 font-semibold cursor-not-allowed select-none"
                title="You already applied to this job"
              >
                ✓ Applied
              </span>
              <Link
                href={`/proposals/${appliedInfo.id}`}
                className="block text-center border border-primary text-primary rounded-full py-2.5 font-medium hover:bg-primary/10"
              >
                View proposal
              </Link>
            </>
          ) : (
            <Link
              href={`/jobs/${job.id}/proposal`}
              target="_blank"
              className="block text-center bg-primary text-primary-foreground rounded-full py-2.5 font-semibold hover:opacity-90"
            >
              Apply now
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            className={`w-full rounded-full py-2.5 font-medium border ${
              isSaved
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            {isSaved ? "♥ Saved" : "♡ Save job"}
          </button>

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-4">
              About the client
            </h3>
            <div className="space-y-4 text-sm">
              <p className="flex items-center gap-2 text-foreground">
                <span className={paymentVerified ? "text-primary" : "text-muted-foreground"}>
                  {paymentVerified ? "✓" : "○"}
                </span>
                Payment method {paymentVerified ? "verified" : "not verified"}
              </p>
              {(info?.avgRating ?? 0) > 0 && (
                <p className="text-foreground">
                  ★ {info.avgRating.toFixed(1)}{" "}
                  <span className="text-muted-foreground">
                    ({info.reviewCount} review{info.reviewCount === 1 ? "" : "s"})
                  </span>
                </p>
              )}
              {country && <p className="text-foreground">{country}</p>}
              <p className="text-muted-foreground">
                {spent > 0 ? `$${spent} total spent` : "New client"}
              </p>
              {info && (
                <>
                  <p className="text-muted-foreground">
                    {info.hireRate}% hire rate, {info.openJobs} open job
                    {info.openJobs === 1 ? "" : "s"}
                  </p>
                  <p className="text-muted-foreground">
                    {info.jobsPosted} job{info.jobsPosted === 1 ? "" : "s"} posted
                    {info.hires > 0
                      ? ` · ${info.hires} hire${info.hires === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </>
              )}
              {memberSince && (
                <p className="text-muted-foreground">
                  Member since {memberSince}
                </p>
              )}
            </div>

            {/* Job link */}
            <div className="mt-5">
              <p className="font-medium text-foreground mb-1 text-sm">Job link</p>
              <CopyLink path={`/jobs/${job.id}`} />
            </div>

            {/* Other open jobs by this client — after the copy link */}
            {extras && extras.otherJobs.length > 0 && (
              <div className="mt-5">
                <OtherOpenJobs jobs={extras.otherJobs} />
              </div>
            )}
          </div>

          {/* Client's recent history (feedback they've received) */}
          {info?.reviews?.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-foreground mb-3">
                Client&apos;s recent history
              </h3>
              <div className="space-y-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {info.reviews.slice(0, 4).map((r: any, i: number) => (
                  <div
                    key={i}
                    className="border-b border-border last:border-0 pb-4 last:pb-0"
                  >
                    <p className="text-sm text-foreground">
                      ★ {(r.rating ?? 0).toFixed(1)}
                    </p>
                    {r.comment && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        “{r.comment}”
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.reviewer || "Freelancer"} ·{" "}
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border py-4">
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-primary"
      />
      {label}
    </label>
  );
}
