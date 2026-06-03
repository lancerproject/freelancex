"use server";

import { createClient } from "../../../lib/supabase-server";
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

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      job_id: jobId,
      freelancer_id: user.id,
      cover_letter: coverLetter,
      bid_amount: Number(bidAmount),
      delivery_days: Number(deliveryDays),
    })
    .select();

  console.log("PROPOSAL DATA:", data);
  console.log("PROPOSAL ERROR:", error);

  redirect("/jobs");
}