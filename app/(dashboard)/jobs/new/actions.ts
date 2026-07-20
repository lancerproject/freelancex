"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { sendJobAlerts, sendSavedSearchAlerts } from "@/lib/job-alerts";
import { redirect } from "next/navigation";

// status is bound at the call site: "open" (publish) or "draft" (save for later)
export async function createJob(status: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Only CLIENTS post jobs — freelancers apply to them. Enforced here (not
  // just in the UI) so the action can't be called directly.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "client") {
    redirect("/dashboard");
  }

  // Optional screening questions (client asks; freelancers answer in proposals).
  let screening: string[] = [];
  try {
    const parsed = JSON.parse(
      (formData.get("screening_questions") as string) || "[]"
    );
    if (Array.isArray(parsed))
      screening = parsed
        .filter((x) => typeof x === "string" && x.trim())
        .slice(0, 8);
  } catch {
    /* no questions */
  }

  const isDraft = status === "draft";

  // Numeric bounds (server-side): a published job needs a sane, positive
  // budget. Drafts may be saved without one, but any provided value is bounded.
  const rawBudget = formData.get("budget");
  const budgetNum = Number(rawBudget);
  const budgetProvided = rawBudget != null && String(rawBudget).trim() !== "";
  const MAX_BUDGET = 1_000_000;
  if (
    budgetProvided &&
    (!Number.isFinite(budgetNum) || budgetNum <= 0 || budgetNum > MAX_BUDGET)
  ) {
    redirect(
      `/dashboard?joberror=${encodeURIComponent(
        "Please enter a valid budget between $1 and $1,000,000."
      )}`
    );
  }
  if (!isDraft && !budgetProvided) {
    redirect(
      `/dashboard?joberror=${encodeURIComponent(
        "Please enter a budget for your job."
      )}`
    );
  }

  const { data: created, error } = await supabase
    .from("jobs")
    .insert({
      title: formData.get("title"),
      description: formData.get("description"),
      budget: budgetProvided ? budgetNum : null,
      category: formData.get("category"),
      job_type: formData.get("job_type") || "fixed",
      experience_level: formData.get("experience_level") || "intermediate",
      duration: formData.get("duration"),
      skills: formData.get("skills"),
      talent_location: formData.get("talent_location") || "worldwide",
      english_level: formData.get("english_level") || null,
      preferred_qualifications: formData.get("preferred_qualifications") || null,
      screening_questions: screening,
      status: isDraft ? "draft" : "open",
      client_id: user.id,
    })
    .select(
      "id, title, budget, skills, category, description, client_id, experience_level"
    )
    .single();

  if (error) {
    console.error("JOB ERROR:", error);
    redirect(`/dashboard?joberror=${encodeURIComponent(error.message)}`);
  }

  if (!isDraft) {
    await notify(
      supabase,
      user.id,
      "system",
      "Your job is live",
      `Your job "${formData.get("title")}" has been posted.`,
      "/my-jobs"
    );

    // Personalized job alerts (Pro) — verified clients only. Best-effort; a
    // failure here must never block the post flow.
    if (created) {
      try {
        const admin = createAdminClient();
        const notified = await sendJobAlerts(admin, created);
        // Saved-search alerts for everyone whose saved search matches (free).
        await sendSavedSearchAlerts(admin, created, notified);
      } catch (e) {
        console.error("job alerts failed:", e);
      }
    }
  }

  // Published jobs get the celebratory page; drafts go back to the dashboard.
  redirect(status === "draft" ? "/dashboard?posted=draft" : "/jobs/posted");
}
