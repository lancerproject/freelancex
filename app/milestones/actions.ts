"use server";

import { createClient } from "../../lib/supabase-server";
import { createAdminClient } from "../../lib/supabase-admin";
import { notify } from "../../lib/notify";
import { asPlan, feeRate, feeFromGross, netFromGross } from "../../lib/fees";
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
    .select("job_id, proposal_id, client_id, status")
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

  redirect(`/contracts/${contractId}`);
}

export async function fundMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  // Only the client on this contract can fund escrow.
  const { contract } = await guardMilestone(
    supabase,
    milestoneId,
    contractId,
    "client"
  );

  // Move the milestone into escrow. No real money moves yet — this represents
  // the client committing funds; real charging is wired when payments go live.
  await supabase
    .from("milestones")
    .update({ payment_status: "funded" })
    .eq("id", milestoneId)
    .eq("contract_id", contractId);

  await notify(
    supabase,
    contract.freelancer_id,
    "payment",
    "Milestone funded",
    `A milestone on "${contract.title}" was funded. You can start working.`,
    `/contracts/${contractId}`
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

  await notify(
    supabase,
    contract.client_id,
    "payment",
    "Work submitted for payment",
    `A milestone on "${contract.title}" was submitted for your approval.`,
    `/contracts/${contractId}`
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

  // Record the freelancer's earnings in the job_payments ledger at the fee rate
  // for their plan at the moment of release (Basic 10%, Pro 5%). Uses the admin
  // client because the approver is the client, not the freelancer whose row we
  // write; the unique index on milestone_id keeps this idempotent.
  if (contract?.freelancer_id && ms?.amount) {
    try {
      const admin = createAdminClient();
      const { data: fp } = await admin
        .from("profiles")
        .select("plan, membership_status, membership_end_date")
        .eq("id", contract.freelancer_id)
        .maybeSingle();
      // Effective plan: Pro only if the period hasn't lapsed.
      const periodActive = fp?.membership_end_date
        ? new Date(fp.membership_end_date).getTime() > Date.now()
        : false;
      const isPro =
        asPlan(fp?.plan) === "pro" &&
        (fp?.membership_status === "active" ||
          ((fp?.membership_status === "cancelled" ||
            fp?.membership_status === "past_due") &&
            periodActive));
      const plan = isPro ? "pro" : "basic";
      const gross = Number(ms.amount) || 0;
      await admin.from("job_payments").upsert(
        {
          job_id: contract.job_id ?? null,
          milestone_id: milestoneId,
          freelancer_id: contract.freelancer_id,
          gross_amount: gross,
          marketplace_fee_rate: feeRate(plan),
          marketplace_fee_amount: feeFromGross(gross, plan),
          net_amount: netFromGross(gross, plan),
          plan_at_time_of_payment: plan,
          payment_date: new Date().toISOString(),
        },
        { onConflict: "milestone_id" }
      );
    } catch (e) {
      console.error("job_payments ledger write failed:", e);
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
  }

  redirect(`/contracts/${contractId}`);
}

export async function deleteMilestone(
  milestoneId: string,
  contractId: string
) {
  const supabase = await createClient();
  // Only the client can delete, and only an UNFUNDED milestone (never one
  // that holds escrow or has already been paid).
  const { milestone } = await guardMilestone(
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

  redirect(`/contracts/${contractId}`);
}
