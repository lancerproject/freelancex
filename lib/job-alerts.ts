// Personalized job alerts (Pro feature). When a VERIFIED client posts a job,
// notify every active Pro freelancer whose skills/categories overlap the job.
// Basic freelancers never receive these. Uses the admin client so it can read
// all freelancer profiles and write notifications on their behalf; notify()
// still respects each recipient's job_alerts preference (in-app + email).

import { notify } from "./notify";
import { getMembership } from "./membership";

function tokenize(...parts: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    for (const t of String(p).split(",")) {
      const s = t.trim().toLowerCase();
      if (s) out.add(s);
    }
  }
  return out;
}

type Job = {
  id: string;
  title: string;
  budget: number | string | null;
  skills: string | null;
  category: string | null;
  description: string | null;
  client_id: string;
};

export async function sendJobAlerts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  job: Job
): Promise<void> {
  // Only verified clients trigger alerts.
  const { data: client } = await admin
    .from("profiles")
    .select("full_name, payment_verified")
    .eq("id", job.client_id)
    .maybeSingle();
  if (!client?.payment_verified) return;

  const jobTokens = tokenize(job.skills, job.category);
  if (jobTokens.size === 0) return;

  // Candidate Pro freelancers.
  const { data: pros } = await admin
    .from("profiles")
    .select(
      "id, skills, categories, plan, membership_status, membership_end_date, membership_autorenew"
    )
    .eq("role", "freelancer")
    .eq("plan", "pro");

  const budget = Number(job.budget) || 0;
  const clientName = client.full_name || "A verified client";

  for (const f of pros ?? []) {
    if (!getMembership(f).isPro) continue; // lazy-expiry guard
    if (f.id === job.client_id) continue;

    const fTokens = tokenize(f.skills, f.categories);
    let overlap = false;
    for (const t of jobTokens) {
      if (fTokens.has(t)) {
        overlap = true;
        break;
      }
    }
    if (!overlap) continue;

    // notify() honours the recipient's job_alerts in-app/email preferences.
    await notify(
      admin,
      f.id,
      "job_alert",
      `New job alert: ${job.title}${budget ? ` — $${budget}` : ""}`,
      `${clientName} posted "${job.title}"${
        budget ? ` with a $${budget} budget` : ""
      }. Skills: ${job.skills || job.category || "—"}. It matches your profile.`,
      `/jobs/${job.id}`
    );
  }
}
