"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteJob } from "@/app/(dashboard)/jobs/actions";

export function JobCardMenu({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);

  const items = [
    { label: "View proposals", href: `/jobs/${jobId}?tab=proposals` },
    { label: "View job posting", href: `/jobs/${jobId}?tab=view` },
    { label: "Invite freelancers", href: `/jobs/${jobId}?tab=invite` },
    { label: "Edit posting", href: "/jobs/new" },
    { label: "Reuse posting", href: "/jobs/new" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Job actions"
        className="px-2 text-muted-foreground hover:text-foreground text-lg leading-none"
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
          <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-border bg-card shadow-lg z-20 py-1">
            {items.map((i) => (
              <Link
                key={i.label}
                href={i.href}
                className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                {i.label}
              </Link>
            ))}
            <form action={deleteJob.bind(null, jobId)}>
              <button
                type="submit"
                className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary"
              >
                Remove posting
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
