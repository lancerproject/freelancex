"use client";

import Link from "next/link";
import { useState } from "react";

type OpenJob = { id: string; title: string; budget: number | null };

// "Other open jobs by this client" — shows the first 3; a button reveals the
// rest when the client has more than 3 open jobs.
export function OtherOpenJobs({ jobs }: { jobs: OpenJob[] }) {
  const [showAll, setShowAll] = useState(false);
  if (jobs.length === 0) return null;
  const shown = showAll ? jobs : jobs.slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground mb-3">
        Other open jobs by this client ({jobs.length})
      </h3>
      <ul className="divide-y divide-border">
        {shown.map((j) => (
          <li key={j.id} className="flex items-center justify-between gap-3 py-2.5">
            <Link
              href={`/jobs/${j.id}`}
              className="text-primary hover:underline text-sm"
            >
              {j.title}
            </Link>
            <span className="text-muted-foreground text-xs shrink-0">
              ${j.budget} · Fixed-price
            </span>
          </li>
        ))}
      </ul>
      {jobs.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-sm text-primary hover:underline font-medium mt-3"
        >
          {showAll ? "Show less" : `View all ${jobs.length} open jobs`}
        </button>
      )}
    </div>
  );
}
