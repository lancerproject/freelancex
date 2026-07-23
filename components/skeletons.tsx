// Lightweight loading skeletons shown instantly during navigation (via each
// route's loading.tsx). They only approximate the real layout so the page feels
// immediate while data loads — no data, no logic, no effect on real features.

function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-secondary/70 animate-pulse ${className}`} />;
}

function JobCardSkeleton() {
  return (
    <div className="border-b border-border py-5">
      <Block className="h-3 w-32 mb-3" />
      <Block className="h-5 w-2/3 mb-3" />
      <div className="flex gap-3 mb-3">
        <Block className="h-3 w-24" />
        <Block className="h-3 w-20" />
        <Block className="h-3 w-16" />
      </div>
      <Block className="h-3 w-full mb-1.5" />
      <Block className="h-3 w-11/12 mb-3" />
      <div className="flex gap-2">
        <Block className="h-6 w-20 rounded-full" />
        <Block className="h-6 w-24 rounded-full" />
        <Block className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

// Job feed / dashboard "Jobs you might like" skeleton.
export function FeedSkeleton({ title }: { title?: string }) {
  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        {title ? (
          <h1 className="text-3xl font-bold text-foreground mb-6">{title}</h1>
        ) : (
          <Block className="h-8 w-48 mb-6" />
        )}
        {/* search bar */}
        <Block className="h-12 w-full rounded-full mb-4" />
        {/* tabs */}
        <div className="flex gap-6 border-b border-border pb-3 mb-2">
          <Block className="h-4 w-24" />
          <Block className="h-4 w-20" />
          <Block className="h-4 w-28" />
        </div>
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

// Generic page skeleton for other data-heavy dashboard pages.
export function PageSkeleton() {
  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Block className="h-8 w-56 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <Block className="h-5 w-1/3 mb-3" />
              <Block className="h-3 w-2/3 mb-2" />
              <Block className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// Talent search (freelancers) skeleton.
export function TalentSkeleton() {
  return (
    <main className="min-h-screen px-4 lg:px-12 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Block className="h-8 w-56 mb-6" />
        <Block className="h-12 w-full rounded-full mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <Block className="h-16 w-16 rounded-full shrink-0" />
              <div className="flex-1">
                <Block className="h-5 w-1/3 mb-2" />
                <Block className="h-3 w-1/2 mb-3" />
                <Block className="h-3 w-full mb-1.5" />
                <Block className="h-3 w-10/12 mb-3" />
                <div className="flex gap-2">
                  <Block className="h-6 w-16 rounded-full" />
                  <Block className="h-6 w-20 rounded-full" />
                  <Block className="h-6 w-14 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
