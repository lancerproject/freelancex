"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function toggleSaveJob(jobId: string, redirectTo: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_jobs").delete().eq("id", existing.id);
  } else {
    await supabase.from("saved_jobs").insert({
      user_id: user.id,
      job_id: jobId,
    });
  }

  redirect(redirectTo);
}

// Same as toggleSaveJob but without a redirect — for inline heart toggles
// (e.g. the freelancer job feed) that update optimistically on the client.
export async function toggleSaveJobQuiet(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_jobs").delete().eq("id", existing.id);
  } else {
    await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: jobId });
  }
}
