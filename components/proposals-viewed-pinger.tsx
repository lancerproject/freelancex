"use client";

import { useEffect, useRef } from "react";
import { markJobProposalsViewed } from "@/app/proposals/actions";

// Renders nothing. When the client opens a job's proposals tab, this marks the
// job's proposals as viewed and notifies each freelancer ("Your proposal was
// viewed"). Runs once per mount; the server action only notifies proposals that
// haven't been viewed yet, so re-opening the tab won't re-notify.
export function ProposalsViewedPinger({ jobId }: { jobId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    markJobProposalsViewed(jobId);
  }, [jobId]);
  return null;
}
