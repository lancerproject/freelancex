"use server";

import { createClient } from "@/lib/supabase-server"
import { loadOwnProfile } from "@/lib/own-profile";
import { notify } from "@/lib/notify";
import { redirect } from "next/navigation";

export async function applyToJob(
  jobId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Suspended accounts can't apply to jobs.
  const { data: meSus } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (meSus?.suspended) redirect("/dashboard");

  const coverLetter =
    formData.get("cover_letter") as string;

  const bidAmount =
    formData.get("bid_amount");

  const deliveryDays =
    formData.get("delivery_days");

  const { data: existingProposal } = await supabase
    .from("proposals")
    .select("id")
    .eq("job_id", jobId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (existingProposal) {
    redirect("/jobs");
  }

  // Applying is free; a job stops accepting proposals after 50 applicants.
  const { count: applicantCount } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId);
  if ((applicantCount ?? 0) >= 50) {
    redirect("/jobs");
  }

  const { error } = await supabase
    .from("proposals")
    .insert({
      job_id: jobId,
      freelancer_id: user.id,
      cover_letter: coverLetter,
      bid_amount: Number(bidAmount),
      delivery_days: Number(deliveryDays),
    });

  if (!error) {
    // Notify the job's client that a freelancer applied.
    const { data: job } = await supabase
      .from("jobs")
      .select("client_id, title")
      .eq("id", jobId)
      .single();
    const me = await loadOwnProfile(user.id);
    const who =
      me?.full_name || me?.username || me?.email || "A freelancer";
    if (job) {
      await notify(
        supabase,
        job.client_id,
        "proposal",
        "New proposal received",
        `${who} applied to your job "${job.title}".`,
        `/jobs/${jobId}?tab=proposals`
      );
    }
  }

  redirect("/jobs");
}