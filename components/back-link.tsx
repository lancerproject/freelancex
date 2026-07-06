"use client";

import { useRouter } from "next/navigation";

// "← Back" that returns to the page the user actually came from (browser
// history), instead of a hardcoded destination. Falls back when the page was
// opened directly (new tab, shared link) and there's nothing to go back to.
export function BackLink({
  fallback = "/dashboard",
  label = "← Back",
  className = "text-sm text-muted-foreground hover:text-foreground",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={className}
    >
      {label}
    </button>
  );
}
