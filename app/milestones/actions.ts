"use server";

import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export async function addMilestone(
  contractId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const amount = Number(formData.get("amount"));
  const due_date = formData.get("due_date") as string;

  const { data: contract } = await supabase
    .from("contracts")
    .select("job_id, proposal_id")
    .eq("id", contractId)
    .single();

  if (!contract) {
    return;
  }

  await supabase.from("milestones").insert({
    contract_id: contractId,
    job_id: contract.job_id,
    proposal_id: contract.proposal_id,
    title,
    amount,
    due_date,
    status: "pending",
  });

  redirect(`/contracts/${contractId}`);
}

export async function submitMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();

  await supabase
    .from("milestones")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", milestoneId);

  redirect(`/contracts/${contractId}`);
}

export async function approveMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();

  await supabase
    .from("milestones")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      payment_status: "released",
    })
    .eq("id", milestoneId);

  redirect(`/contracts/${contractId}`);
}

export async function deleteMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();

  await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId);

  redirect(`/contracts/${contractId}`);
}
