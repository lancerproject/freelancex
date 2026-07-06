"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteJob } from "@/app/(dashboard)/jobs/actions";

export function JobPostMenu({
  jobId,
  isDraft,
}: {
  jobId: string;
  isDraft: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Job actions"
        className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary"
      >
        •••
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-lg z-20 py-1">
            {isDraft ? (
              <>
                <Link
                  href={`/jobs/${jobId}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  Edit draft
                </Link>
                <form action={deleteJob.bind(null, jobId)}>
                  <button
                    type="submit"
                    className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary"
                  >
                    Remove draft
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/jobs/new"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  Reuse posting
                </Link>
                <Link
                  href={`/jobs/${jobId}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  View job posting
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
