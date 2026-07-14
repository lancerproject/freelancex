"use server";

import { createClient } from "../../lib/supabase-server";
import { createAdminClient } from "../../lib/supabase-admin";
import { notify } from "../../lib/notify";
import { postContractEvent } from "../../lib/chat-events";
import { redirect } from "next/navigation";

// Load a contract and confirm the signed-in user is the party allowed to run
// this milestone action. Milestone actions were previously callable by anyone
// with a milestone id — these guards close that hole server-side.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function guardMilestone(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  milestoneId: string,
  contractId: string,
  who: "client" | "freelancer"
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The milestone must actually belong to this contract.
  const { data: milestone } = await supabase
    .from("milestones")
    .select("id, contract_id, status, payment_status")
    .eq("id", milestoneId)
    .eq("contract_id", contractId)
    .maybeSingle();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, job_id, status")
    .eq("id", contractId)
    .maybeSingle();

  if (!milestone || !contract) redirect(`/contracts/${contractId}`);

  const allowedId =
    who === "client" ? contract.client_id : contract.freelancer_id;
  if (user.id !== allowedId) redirect(`/contracts/${contractId}`);

  return { user, contract, milestone };
}

export async function addMilestone(
  contractId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = formData.get("title") as string;
  const amount = Number(formData.get("amount"));
  const due_date = formData.get("due_date") as string;

  const { data: contract } = await supabase
    .from("contracts")
    .select("job_id, proposal_id, client_id, freelancer_id, status")
    .eq("id", contractId)
    .single();

  // Only the client on an active contract adds milestones directly.
  if (
    !contract ||
    contract.client_id !== user.id ||
    contract.status !== "active"
  ) {
    redirect(`/contracts/${contractId}`);
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

  await postContractEvent(
    supabase,
    contract,
    user.id,
    `🧩 Client added a milestone: "${title}" ($${amount}).`
  );

  redirect(`/contracts/${contractId}`);
}

// Freelancer proposes a NEW milestone on an active contract. It's created
// unfunded — the client is notified and activates it by funding escrow.
export async function proposeMilestone(
  contractId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = ((formData.get("title") as string) || "").trim();
  const amount = Number(formData.get("amount"));
  const due_date = ((formData.get("due_date") as string) || "").trim() || null;

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, job_id, proposal_id, client_id, freelancer_id, title, status")
    .eq("id", contractId)
    .single();
  if (
    !contract ||
    contract.freelancer_id !== user.id ||
    contract.status !== "active" ||
    !title ||
    !(amount > 0)
  ) {
    redirect(`/contracts/${contractId}`);
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

  await notify(
    supabase,
    contract.client_id,
    "contract",
    "New milestone proposed",
    `A new milestone "${title}" ($${amount}) was proposed on "${contract.title}". Fund it to activate the work.`,
    `/contracts/${contractId}`
  );

  await postContractEvent(
    supabase,
    contract,
    user.id,
    `🧩 Freelancer proposed a milestone: "${title}" ($${amount}). Fund it to activate the work.`
  );

  redirect(`/contracts/${contractId}`);
}

export async function fundMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  // Only the client on this contract can fund escrow.
  const { user, contract } = await guardMilestone(
    supabase,
    milestoneId,
    contractId,
    "client"
  );

  // Keep the legacy flag (drives existing button logic) …
  await supabase
    .from("milestones")
    .update({ payment_status: "funded" })
    .eq("id", milestoneId)
    .eq("contract_id", contractId);

  // … and drive the escrow engine: FUNDED state + append-only ledger (funds
  // in escrow + client fee). Idempotency key blocks a double-fund.
  try {
    const admin = createAdminClient();
    await admin.rpc("escrow_fund_milestone", {
      p_milestone: milestoneId,
      p_actor: user.id,
      p_idem: `fund:${milestoneId}`,
    });
  } catch (e) {
    console.error("escrow fund failed:", e);
  }

  await notify(
    supabase,
    contract.freelancer_id,
    "payment",
    "Milestone funded",
    `A milestone on "${contract.title}" was funded. You can start working.`,
    `/contracts/${contractId}`
  );

  await postContractEvent(
    supabase,
    contract,
    user.id,
    `💰 Client funded a milestone — payment is now held safely in escrow. You can start working.`
  );

  redirect(`/contracts/${contractId}`);
}

export async function submitMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  // Only the freelancer on this contract can submit work.
  const { contract, milestone } = await guardMilestone(
    supabase,
    milestoneId,
    contractId,
    "freelancer"
  );
  // Work can only be submitted once it's funded and still pending.
  if (milestone.payment_status !== "funded" || milestone.status !== "pending") {
    redirect(`/contracts/${contractId}`);
  }

  await supabase
    .from("milestones")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", milestoneId)
    .eq("contract_id", contractId);

  // Escrow engine: FUNDED → IN_REVIEW and start the 5-day auto-approve timer.
  try {
    const admin = createAdminClient();
    await admin.rpc("escrow_submit_work", {
      p_milestone: milestoneId,
      p_actor: contract.freelancer_id,
    });
  } catch (e) {
    console.error("escrow submit failed:", e);
  }

  await notify(
    supabase,
    contract.client_id,
    "payment",
    "Work submitted for payment",
    `A milestone on "${contract.title}" was submitted for your approval. It auto-approves in 5 days if not reviewed.`,
    `/contracts/${contractId}`
  );

  await postContractEvent(
    supabase,
    contract,
    contract.freelancer_id,
    `📤 Freelancer submitted work for review. It auto-approves in 5 days if not reviewed.`
  );

  redirect(`/contracts/${contractId}`);
}

export async function approveMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  // Only the client on this contract can approve & release.
  const { contract: guarded, milestone } = await guardMilestone(
    supabase,
    milestoneId,
    contractId,
    "client"
  );
  // Only submitted work can be approved (blocks double-release).
  if (milestone.status !== "submitted") {
    redirect(`/contracts/${contractId}`);
  }

  const { data: ms } = await supabase
    .from("milestones")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      payment_status: "released",
    })
    .eq("id", milestoneId)
    .eq("contract_id", contractId)
    .select("amount")
    .single();

  const contract = guarded;

  // Add the released amount to the client's lifetime spend (the approver IS the
  // client, so updating their own profile is allowed).
  if (contract?.client_id && ms?.amount) {
    const { data: cp } = await supabase
      .from("profiles")
      .select("total_spent")
      .eq("id", contract.client_id)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({ total_spent: (Number(cp?.total_spent) || 0) + Number(ms.amount) })
      .eq("id", contract.client_id);
  }

  // Escrow engine: IN_REVIEW → PENDING. The freelancer service fee is cut HERE
  // (Basic 10% / Pro 5%), the net is posted to the append-only ledger, and the
  // 3-day security hold starts before the funds become withdrawable. The Pro
  // rate is resolved inside the DB function from the freelancer's plan.
  if (guarded?.client_id) {
    try {
      const admin = createAdminClient();
      const { error: eErr } = await admin.rpc("escrow_approve_milestone", {
        p_milestone: milestoneId,
        p_actor: guarded.client_id,
        p_auto: false,
      });
      if (eErr) console.error("escrow approve failed:", eErr.message);
    } catch (e) {
      console.error("escrow approve failed:", e);
    }
  }

  if (contract) {
    await notify(
      supabase,
      contract.freelancer_id,
      "payment",
      "Milestone approved & paid",
      `A milestone on "${contract.title}" was approved and paid.`,
      `/contracts/${contractId}`
    );
    await postContractEvent(
      supabase,
      contract,
      contract.client_id,
      `✅ Client approved the work and released the milestone payment.`
    );
  }

  redirect(`/contracts/${contractId}`);
}

// Client asks for changes on submitted work — sends the milestone back to the
// freelancer to revise. Escrow stays funded (IN_REVIEW → FUNDED); the
// freelancer can resubmit without re-funding.
export async function requestChangesMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  const { contract, milestone } = await guardMilestone(
    supabase,
    milestoneId,
    contractId,
    "client"
  );
  if (milestone.status !== "submitted") {
    redirect(`/contracts/${contractId}`);
  }

  await supabase
    .from("milestones")
    .update({ status: "pending", submitted_at: null })
    .eq("id", milestoneId)
    .eq("contract_id", contractId);

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("escrow_reject_milestone", {
      p_milestone: milestoneId,
      p_actor: contract.client_id,
    });
    if (error) console.error("escrow reject failed:", error.message);
  } catch (e) {
    console.error("escrow reject failed:", e);
  }

  await notify(
    supabase,
    contract.freelancer_id,
    "contract",
    "Changes requested",
    `The client asked for changes on a milestone in "${contract.title}". Review their notes in the chat and resubmit when ready.`,
    `/contracts/${contractId}`
  );

  await postContractEvent(
    supabase,
    contract,
    contract.client_id,
    `🔁 Client requested changes on the submitted work. The milestone is back in progress — resubmit when ready.`
  );

  redirect(`/contracts/${contractId}`);
}

export async function deleteMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  // Only the client can delete, and only an UNFUNDED milestone (never one
  // that holds escrow or has already been paid).
  const { contract, milestone } = await guardMilestone(
    supabase,
    milestoneId,
    contractId,
    "client"
  );
  if (
    milestone.payment_status === "funded" ||
    milestone.payment_status === "released"
  ) {
    redirect(`/contracts/${contractId}`);
  }

  await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("contract_id", contractId);

  await notify(
    supabase,
    contract.freelancer_id,
    "contract",
    "A milestone was removed",
    `A milestone on "${contract.title}" was removed by the client.`,
    `/contracts/${contractId}`
  );

  await postContractEvent(
    supabase,
    contract,
    contract.client_id,
    `🗑️ Client removed an unfunded milestone.`
  );

  redirect(`/contracts/${contractId}`);
}
