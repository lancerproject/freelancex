"use client";

import Link from "next/link";
import { useState } from "react";

export function ContractMenu({
  contractId,
  otherId,
  otherName,
  jobId,
}: {
  contractId: string;
  otherId: string;
  otherName: string;
  jobId?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const items = [
    {
      label: "View milestones & payments",
      href: `/contracts/${contractId}?tab=overview`,
    },
    { label: "Send a message", href: `/contracts/${contractId}?tab=messages` },
    {
      label: "View terms & settings",
      href: `/contracts/${contractId}?tab=details`,
    },
    ...(jobId
      ? [{ label: "View original job posting", href: `/jobs/${jobId}` }]
      : []),
    { label: `${otherName}'s profile`, href: `/profile/${otherId}` },
    { label: "Request a refund", href: `/contracts/${contractId}/refund` },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Contract actions"
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
          <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-border bg-card shadow-lg z-20 py-1">
            {items.map((i) => (
              <Link
                key={i.label}
                href={i.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-foreground hover:bg-secondary"
              >
                {i.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
