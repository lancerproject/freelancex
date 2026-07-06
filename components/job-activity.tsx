"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  getJobActivity,
  type JobActivityCounts,
} from "@/app/(dashboard)/jobs/activity-actions";
import { proposalsBucket } from "@/lib/proposals";

// Live "Activity on this job" stats. Fetches the real numbers on mount and
// then updates in real time whenever a proposal or a conversation for this job
// changes — so everyone watching the job sees the counts move as people apply,
// get invited, or start interviewing.
export function JobActivity({
  jobId,
  initial,
  refreshOnMount = true,
}: {
  jobId: string;
  initial: JobActivityCounts;
  // When the caller already has the true counts (e.g. the feed slide-over,
  // which fetches them in its combined panel action), skip the extra
  // server-action round-trip on mount and just keep the realtime updates.
  refreshOnMount?: boolean;
}) {
  const [c, setC] = useState<JobActivityCounts>(initial);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      getJobActivity(jobId).then((next) => {
        if (alive) setC(next);
      });

    // Pull the true numbers right away, unless the caller already has them.
    if (refreshOnMount) refresh();

    const channel = supabase
      .channel(`job-activity:${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proposals", filter: `job_id=eq.${jobId}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `job_id=eq.${jobId}` },
        refresh
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [jobId, supabase, refreshOnMount]);

  const Item = ({ label, value }: { label: string; value: string | number }) => (
    <p className="text-muted-foreground">
      {label}: <span className="text-foreground font-medium">{value}</span>
    </p>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
      <Item label="Proposals" value={proposalsBucket(c.proposals)} />
      <Item label="Interviewing" value={c.interviewing} />
      <Item label="Hired" value={c.hired} />
      <Item label="Invites sent" value={c.invitesSent} />
      <Item label="Unanswered invites" value={c.unanswered} />
    </div>
  );
}
