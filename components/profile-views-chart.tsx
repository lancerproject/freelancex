// Bar chart of daily profile views (server-computed data, no client JS needed).
// Rendered on the stats page; counts come from profile_view_events.

export function ProfileViewsChart({
  days,
}: {
  days: { label: string; count: number }[];
}) {
  const total = days.reduce((t, d) => t + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  // With 30 days the labels crowd — show every 5th.
  const labelEvery = days.length > 10 ? 5 : 1;

  return (
    <div>
      <p className="text-2xl font-bold text-foreground">
        {total} profile view{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-end justify-between gap-1 h-28 mt-4">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full bg-secondary rounded-t flex items-end h-24">
              <div
                className="w-full bg-primary rounded-t"
                style={{ height: `${(d.count / max) * 100}%` }}
                title={`${d.label}: ${d.count}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {i % labelEvery === 0 ? d.label : " "}
            </span>
          </div>
        ))}
      </div>
      {total === 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          Views appear here as clients discover your profile.
        </p>
      )}
    </div>
  );
}
