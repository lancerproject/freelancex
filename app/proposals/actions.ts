"use server";

import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export async function hireFreelancer(proposalId: string) {
  const supabase = await createClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select(`*, jobs (*)`)
    .eq("id", proposalId)
    .single();

  if (!proposal) return;

  await supabase
    .from("proposals")
    .update({ status: "accepted" })
    .eq("id", proposalId);

  const { data: contractData } = await supabase
    .from("contracts")
    .insert({
      job_id: proposal.job_id,
      client_id: proposal.jobs.client_id,
      freelancer_id: proposal.freelancer_id,
      proposal_id: proposal.id,
      title: proposal.jobs.title,
      amount: proposal.bid_amount,
      status: "active",
      start_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (contractData) {
    await supabase.from("conversations").insert({
      job_id: proposal.job_id,
      contract_id: contractData.id,
      participant_1: proposal.jobs.client_id,
      participant_2: proposal.freelancer_id,
    });

    await supabase.from("notifications").insert([
      {
        user_id: proposal.freelancer_id,
        type: "proposal",
        title: "You got hired!",
        message: "You have been hired for " + proposal.jobs.title,
        link: "/contracts/" + contractData.id,
        is_read: false,
      },
      {
        user_id: proposal.jobs.client_id,
        type: "system",
        title: "Contract Started",
        message: "You hired a freelancer for " + proposal.jobs.title,
        link: "/contracts/" + contractData.id,
        is_read: false,
      },
    ]);
  }

  redirect("/contracts");
}

export async function completeContract(contractId: string) {
  const supabase = await createClient();

  await supabase
    .from("contracts")
    .update({
      status: "completed",
      end_date: new Date().toISOString(),
    })
    .eq("id", contractId);

  redirect("/contracts");
}