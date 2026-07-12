"use client";

import { useEffect, useState } from "react";

// A one-time message banner seeded from a URL query param (e.g. ?posted=1,
// ?joberror=...). On mount it strips the query string from the address so a
// page refresh doesn't keep re-showing a stale message, and it can be
// dismissed with the ✕.
export function FlashBanner({
  tone = "success",
  children,
}: {
  tone?: "success" | "error";
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!show) return null;

  const styles =
    tone === "error"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-primary/30 bg-primary/10 text-primary";

  return (
    <div
      className={`rounded-lg border ${styles} px-4 py-2.5 text-sm flex items-start justify-between gap-3`}
    >
      <div>{children}</div>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Dismiss"
        className="shrink-0 text-current/70 hover:text-current leading-none"
      >
        ✕
      </button>
    </div>
  );
}
