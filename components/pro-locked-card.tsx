import Link from "next/link";

// A consistent "locked" card shown to Basic users wherever a Pro feature is
// gated. Server component (no interactivity) — safe to use on any page.
export function ProLockedCard({
  title,
  body,
  compact = false,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-secondary/40 text-center ${
        compact ? "p-5" : "p-8"
      }`}
    >
      <div className="text-2xl" aria-hidden>
        🔒
      </div>
      <h3 className="font-semibold text-foreground mt-2">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>
      <Link
        href="/settings/membership"
        className="inline-block mt-4 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
