"use server";

import { createClient } from "@/lib/supabase-server";

// Allowed flag reasons (kept in sync with the report modal's radio options).
// Local (not exported) — a "use server" file may only export async functions.
const REPORT_REASONS = ["fraud", "inappropriate", "tos", "spam", "other"];

// Freelancer flags a job as inappropriate. Authenticates, validates the reason,
// prevents duplicate reports, and saves it for later admin review.
export async function reportJob(
  jobId: string,
  reason: string,
  description: string
): Promise<{ ok: boolean; error?: string; alreadyReported?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  if (!REPORT_REASONS.includes(reason)) {
    return { ok: false, error: "Please choose a reason." };
  }
  const desc = (description || "").trim();
  if (reason === "other" && !desc) {
    return { ok: false, error: "Please describe the issue." };
  }

  // Prevent duplicates up front (nicer message than a constraint error).
  const { data: existing } = await supabase
    .from("job_reports")
    .select("id")
    .eq("job_id", jobId)
    .eq("freelancer_id", user.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, alreadyReported: true, error: "You have already reported this job." };
  }

  const { error } = await supabase.from("job_reports").insert({
    job_id: jobId,
    freelancer_id: user.id,
    reason,
    description: reason === "other" ? desc : desc || null,
    status: "pending",
  });

  if (error) {
    // Unique-constraint race → treat as already reported.
    if (error.code === "23505") {
      return { ok: false, alreadyReported: true, error: "You have already reported this job." };
    }
    return { ok: false, error: "Couldn't submit your report. Please try again." };
  }

  return { ok: true };
}
