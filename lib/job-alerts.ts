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
  experience_level?: string | null;
};

export async function sendJobAlerts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  job: Job
): Promise<string[]> {
  const notified: string[] = [];
  // Only verified clients trigger alerts.
  const { data: client } = await admin
    .from("profiles")
    .select("full_name, payment_verified")
    .eq("id", job.client_id)
    .maybeSingle();
  if (!client?.payment_verified) return notified;

  const jobTokens = tokenize(job.skills, job.category);
  if (jobTokens.size === 0) return notified;

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
    notified.push(f.id);
  }
  return notified;
}

// Saved-search alerts (free for all freelancers). When a job is posted, notify
// everyone whose SAVED SEARCH matches it — deduped, and skipping anyone already
// alerted by the Pro profile-skill match above. Honours the job_alerts pref.
export async function sendSavedSearchAlerts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  job: Job,
  alreadyNotified: string[] = []
): Promise<void> {
  const { data: searches } = await admin
    .from("saved_searches")
    .select("user_id, query, category, experience_level, min_budget");
  if (!searches?.length) return;

  const hay = `${job.title || ""} ${job.description || ""} ${
    job.skills || ""
  }`.toLowerCase();
  const jobBudget = Number(job.budget) || 0;
  const skip = new Set([...alreadyNotified, job.client_id]);
  const done = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (s: any): boolean => {
    if (s.category && job.category !== s.category) return false;
    if (s.experience_level && job.experience_level !== s.experience_level)
      return false;
    if (s.min_budget != null && jobBudget < Number(s.min_budget)) return false;
    if (s.query) {
      const toks = String(s.query).toLowerCase().split(/\s+/).filter(Boolean);
      if (!toks.every((t: string) => hay.includes(t))) return false;
    }
    return true;
  };

  for (const s of searches) {
    if (skip.has(s.user_id) || done.has(s.user_id)) continue;
    if (!matches(s)) continue;
    done.add(s.user_id);
    await notify(
      admin,
      s.user_id,
      "job_alert",
      `New job matches your saved search: ${job.title}`,
      `A new job "${job.title}"${
        jobBudget ? ` ($${jobBudget})` : ""
      } matches a search you saved. Take a look before it fills up.`,
      `/jobs/${job.id}`
    );
  }
}
