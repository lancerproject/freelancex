// Proposal Insights (Pro feature). Presentational — the page computes the data
// (server-side) and gates access; Basic users get the locked card instead.

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function ProposalInsights({
  viewed,
  viewedAt,
  clientLastActive,
  rank,
  total,
  profileViews,
}: {
  viewed: boolean;
  viewedAt: string | null;
  clientLastActive: string | null;
  rank: number | null;
  total: number;
  profileViews: number;
}) {
  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: "Viewed by client",
      value: viewed ? "Yes" : "Not yet",
      hint: viewed && viewedAt ? timeAgo(viewedAt) : undefined,
    },
    {
      label: "Client activity",
      value: clientLastActive ? timeAgo(clientLastActive) : "Unknown",
      hint: clientLastActive ? "last active" : undefined,
    },
    {
      label: "Your ranking",
      value: rank ? `#${rank} of ${total}` : `${total} proposal${total === 1 ? "" : "s"}`,
      hint: rank ? "by submission time" : undefined,
    },
    {
      label: "Profile views from client",
      value: String(profileViews),
      hint: profileViews === 1 ? "view" : "views",
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">Proposal insights</h2>
        <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
          ⭐ Pro
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        How your proposal is performing on this job.
      </p>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            {s.hint && (
              <p className="text-xs text-muted-foreground mt-0.5">{s.hint}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
