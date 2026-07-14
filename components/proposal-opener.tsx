"use client";

import { useState } from "react";
import { ProposalPanel } from "@/components/proposal-panel";
import {
  getProposalPanelData,
  type ProposalPanelData,
} from "@/app/(dashboard)/jobs/client-actions";

// Wraps a trigger (the freelancer's name on a review card). Clicking opens the
// proposal detail in a right-side slide-in panel on the same page — the same
// pattern the freelancer's job feed uses — instead of navigating away.
export function ProposalOpener({
  jobId,
  proposalId,
  className,
  children,
}: {
  jobId: string;
  proposalId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProposalPanelData | null>(null);
  const [loading, setLoading] = useState(false);

  const openPanel = async () => {
    setOpen(true);
    if (!data) {
      setLoading(true);
      const d = await getProposalPanelData(jobId, proposalId).catch(() => null);
      setData(d);
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={openPanel} className={className}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card w-full max-w-3xl h-full overflow-y-auto shadow-2xl">
            {loading || !data ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {loading ? "Loading proposal…" : "Couldn't load this proposal."}
              </div>
            ) : (
              <ProposalPanel data={data} onClose={() => setOpen(false)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
