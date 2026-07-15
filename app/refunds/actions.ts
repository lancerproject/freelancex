"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { postContractEvent } from "@/lib/chat-events";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Refund requests on a contract. Either party can start one (a client asks
// for money back; a freelancer offers one). The OTHER party accepts or
// declines. On accept, a negative row goes into the job_payments ledger so
// the freelancer's balance and every earnings page update automatically.

async function loadContract(contractId: string, userId: string) {
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, job_id, title")
    .eq("id", contractId)
    .maybeSingle();
  if (
    !contract ||
    (contract.client_id !== userId && contract.freelancer_id !== userId)
  ) {
    return null;
  }
  return { supabase, contract };
}

export async function requestRefund(contractId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const loaded = await loadContract(contractId, user.id);
  if (!loaded) redirect("/contracts");
  const { contract } = loaded;

  const amount =
    Math.round((Number(formData.get("amount")) + Number.EPSILON) * 100) / 100;
  const reason = ((formData.get("reason") as string) || "").trim();
  const back = `/contracts/${contractId}/refund`;

  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`${back}?error=amount`);
  }
  if (reason.length < 10) {
    redirect(`${back}?error=reason`);
  }

  // Can't ask back more than was actually paid on this contract. Money counts
  // as "paid" once it's released to the freelancer — via the escrow flow
  // (escrow_status PENDING/AVAILABLE/WITHDRAWN) OR the legacy payment_status.
  const { data: ms } = await supabase
    .from("milestones")
    .select("amount, payment_status, escrow_status")
    .eq("contract_id", contractId);
  const releasedStates = new Set(["PENDING", "AVAILABLE", "WITHDRAWN"]);
  const paid = (ms ?? []).reduce(
    (t, m) =>
      t +
      (m.payment_status === "released" ||
      releasedStates.has(m.escrow_status as string)
        ? Number(m.amount) || 0
        : 0),
    0
  );
  if (amount > paid) {
    redirect(`${back}?error=paid`);
  }

  // One open request at a time.
  const { data: existing } = await supabase
    .from("refund_requests")
    .select("id")
    .eq("contract_id", contractId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existing) {
    redirect(`${back}?error=pending`);
  }

  await supabase.from("refund_requests").insert({
    contract_id: contractId,
    requester_id: user.id,
    amount,
    reason,
  });

  const other =
    contract.client_id === user.id
      ? contract.freelancer_id
      : contract.client_id;
  const money = amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
  await notify(
    supabase,
    other,
    "payments",
    "Refund requested",
    `A refund of ${money} was requested on "${contract.title}". Review and respond.`,
    back
  );
  await postContractEvent(
    supabase,
    contract,
    user.id,
    `💵 ${contract.client_id === user.id ? "The client" : "The freelancer"} requested a refund of ${money}.${reason ? ` Reason: ${reason}` : ""}`
  );
  revalidatePath(back);
  redirect(back);
}

export async function respondRefund(
  requestId: string,
  accept: boolean
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: req } = await supabase
    .from("refund_requests")
    .select("id, contract_id, requester_id, amount, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.status !== "pending") redirect("/contracts");

  const loaded = await loadContract(req.contract_id, user.id);
  if (!loaded) redirect("/contracts");
  const { contract } = loaded;

  // Only the party who DIDN'T ask can respond.
  if (req.requester_id === user.id) {
    redirect(`/contracts/${req.contract_id}/refund`);
  }

  await supabase
    .from("refund_requests")
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  const amount = Number(req.amount) || 0;
  if (accept) {
    // Negative ledger row: the freelancer's balance goes down by the refund,
    // and the money is returned to the client.
    const { data: fp } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", contract.freelancer_id)
      .maybeSingle();
    const admin = createAdminClient();
    await admin.from("job_payments").insert({
      freelancer_id: contract.freelancer_id,
      job_id: contract.job_id,
      gross_amount: -amount,
      marketplace_fee_rate: 0,
      marketplace_fee_amount: 0,
      net_amount: -amount,
      plan_at_time_of_payment: fp?.plan ?? "basic",
      payment_date: new Date().toISOString(),
    });
  }

  const money = amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
  await notify(
    supabase,
    req.requester_id,
    "payments",
    accept ? "Refund accepted" : "Refund declined",
    accept
      ? `The ${money} refund on "${contract.title}" was accepted. The amount has been returned.`
      : `The ${money} refund request on "${contract.title}" was declined.`,
    `/contracts/${req.contract_id}/refund`
  );
  await postContractEvent(
    supabase,
    contract,
    user.id,
    accept
      ? `💸 The ${money} refund was accepted — the amount has been returned to the client.`
      : `🚫 The ${money} refund request was declined.`
  );
  revalidatePath(`/contracts/${req.contract_id}/refund`);
  redirect(`/contracts/${req.contract_id}/refund`);
}

export async function cancelRefund(requestId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: req } = await supabase
    .from("refund_requests")
    .select("id, contract_id, requester_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.requester_id !== user.id || req.status !== "pending") {
    redirect("/contracts");
  }

  await supabase
    .from("refund_requests")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", requestId);
  revalidatePath(`/contracts/${req.contract_id}/refund`);
  redirect(`/contracts/${req.contract_id}/refund`);
}
