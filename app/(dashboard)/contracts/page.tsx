import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { rehire } from "./actions";
import { ContractMenu } from "@/components/contract-menu";
import { StarRating } from "@/components/star-rating";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    status?: string;
    feedback?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isClientUser = meProfile?.role === "client";

  let query = supabase
    .from("contracts")
    .select("*")
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order("start_date", { ascending: sp.sort === "asc", nullsFirst: false });

  if (sp.q) query = query.ilike("title", `%${sp.q}%`);
  if (sp.status === "active") query = query.eq("status", "active");
  if (sp.status === "completed") query = query.eq("status", "completed");

  const { data: contracts } = await query;
  const list = contracts ?? [];

  // Other party names + avatars
  const otherIds = [
    ...new Set(
      list.map((c) =>
        c.client_id === user.id ? c.freelancer_id : c.client_id
      )
    ),
  ].filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profById: Record<string, any> = {};
  if (otherIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", otherIds);
    for (const p of profs ?? []) profById[p.id] = p;
  }

  // Ratings the current user gave (shown on ended rows)
  const ids = list.map((c) => c.id);
  const ratingByContract: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: revs } = await supabase
      .from("reviews")
      .select("contract_id, rating")
      .eq("reviewer_id", user.id)
      .in("contract_id", ids);
    for (const r of revs ?? []) ratingByContract[r.contract_id] = r.rating;
  }

  const status = sp.status ?? "all";
  const chips = [
    { key: "all", label: "All" },
    { key: "active", label: "Active contracts" },
    { key: "completed", label: "Ended" },
  ];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      {/* Tabs (client only — freelancers don't post jobs) */}
      {isClientUser && (
        <div className="flex gap-6 border-b border-border mb-6 text-sm">
          <Link
            href="/my-jobs"
            className="pb-2 text-muted-foreground hover:text-foreground"
          >
            All job posts
          </Link>
          <span className="pb-2 border-b-2 border-foreground text-foreground font-medium">
            All contracts
          </span>
        </div>
      )}

      <h1 className="text-3xl font-bold text-foreground mb-6">
        {isClientUser ? "All contracts" : "Your contracts"}
      </h1>

      {sp.feedback === "submitted" && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 text-primary p-3 text-sm">
          ✓ Thanks — your feedback was submitted. It appears on your
          counterpart&apos;s profile once you both review, or when the 14-day
          window ends.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <form method="get" className="flex-1 min-w-[240px]">
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search by contract or freelancer name"
            className="w-full bg-card border border-border text-foreground rounded-full px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <Link
            href={`/contracts?sort=${sp.sort === "asc" ? "desc" : "asc"}${
              status !== "all" ? `&status=${status}` : ""
            }`}
            className="border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-secondary"
          >
            Start date {sp.sort === "asc" ? "↑" : "↓"}
          </Link>
          <span className="text-muted-foreground">{list.length} total</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-2">
        {chips.map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/contracts" : `/contracts?status=${c.key}`}
            className={`text-sm px-3 py-1.5 rounded-full ${
              status === c.key
                ? "bg-primary text-white"
                : "bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <a
          href="/api/contracts-export"
          className="text-primary text-sm font-medium hover:underline"
        >
          ↓ Download CSV
        </a>
      </div>

      <div className="divide-y divide-border border-y border-border">
        {list.length === 0 && (
          <p className="text-muted-foreground py-12 text-center">
            No contracts found.
          </p>
        )}
        {list.map((c) => {
          const amClient = c.client_id === user.id;
          const otherId = amClient ? c.freelancer_id : c.client_id;
          const other = profById[otherId];
          const otherName = other?.full_name || other?.username || "Member";
          const ended = c.status === "completed";
          const rating = ratingByContract[c.id];
          const initials = otherName.slice(0, 1).toUpperCase();

          return (
            <div
              key={c.id}
              className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-6"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/contracts/${c.id}`}
                  className="text-lg font-semibold text-foreground hover:text-primary"
                >
                  {c.title}
                </Link>
                <div className="flex items-center gap-2 mt-2">
                  {other?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={other.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {initials}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {amClient ? otherName : `Hired by ${otherName}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.start_date
                    ? new Date(c.start_date).toLocaleDateString()
                    : "—"}{" "}
                  –{" "}
                  {ended && c.end_date
                    ? new Date(c.end_date).toLocaleDateString()
                    : "Present"}
                </p>
              </div>

              <div className="md:text-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      ended
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {ended ? "Ended" : "Active"}
                  </span>
                  {ended && rating && (
                    <span className="flex items-center gap-1">
                      <StarRating value={rating} size="text-xs" />
                      <span className="text-sm text-muted-foreground">
                        {rating}.0
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-foreground font-medium mt-2">
                  ${c.amount} Budget
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {ended && amClient ? (
                  <form action={rehire.bind(null, c.id)}>
                    <button className="border border-primary text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/10 whitespace-nowrap">
                      Rehire
                    </button>
                  </form>
                ) : (
                  <Link
                    href={`/contracts/${c.id}`}
                    className="border border-primary text-primary px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/10 whitespace-nowrap"
                  >
                    {amClient ? "Review work" : "Submit work"}
                  </Link>
                )}
                <ContractMenu
                  contractId={c.id}
                  otherId={otherId}
                  otherName={otherName}
                  jobId={c.job_id}
                />
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
