"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { sendJobAlerts } from "@/lib/job-alerts";
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

  const isDraft = status === "draft";
  const { data: created, error } = await supabase
    .from("jobs")
    .insert({
      title: formData.get("title"),
      description: formData.get("description"),
      budget: formData.get("budget"),
      category: formData.get("category"),
      job_type: formData.get("job_type") || "fixed",
      experience_level: formData.get("experience_level") || "intermediate",
      duration: formData.get("duration"),
      skills: formData.get("skills"),
      talent_location: formData.get("talent_location") || "worldwide",
      english_level: formData.get("english_level") || null,
      preferred_qualifications: formData.get("preferred_qualifications") || null,
      status: isDraft ? "draft" : "open",
      client_id: user.id,
    })
    .select(
      "id, title, budget, skills, category, description, client_id"
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
        await sendJobAlerts(createAdminClient(), created);
      } catch (e) {
        console.error("job alerts failed:", e);
      }
    }
  }

  // Published jobs get the celebratory page; drafts go back to the dashboard.
  redirect(status === "draft" ? "/dashboard?posted=draft" : "/jobs/posted");
}
