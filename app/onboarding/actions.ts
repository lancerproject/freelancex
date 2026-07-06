"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Saves the freelancer onboarding answers. These columns are optional — if they
// don't exist yet we silently skip them so onboarding never blocks the user.
export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const experience = (formData.get("experience") as string) || "";
  const goal = (formData.get("goal") as string) || "";
  const availability = (formData.get("availability") as string) || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // profile_step="work" marks that they've started the wizard, so a returning
  // user resumes here even if they drop off before saving the first step.
  const row: any = { profile_step: "work" };
  if (experience) row.experience_level = experience;
  if (goal) row.freelance_goal = goal;
  if (availability) row.availability_pref = availability;

  if (Object.keys(row).length > 0) {
    // UPDATE (not upsert) — the row exists and `username` is NOT NULL.
    const { error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", user.id);
    if (error) {
      console.log("Onboarding save skipped:", error.message);
    }
  }

  redirect("/create-profile");
}
