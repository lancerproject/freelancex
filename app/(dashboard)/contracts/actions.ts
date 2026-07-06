"use server";

import { createClient } from "@/lib/supabase-server";
import { notify } from "@/lib/notify";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { refundEscrowAndComplete } from "@/lib/contract-closure";
import { openSupportTicket, parseAttachments } from "@/lib/support";

// Days a freelancer has to act after a client ends a contract that still
// holds escrow.
const CLOSURE_WINDOW_DAYS = 7;

// Raise a dispute on a contract — either party can flag a problem. Sets the
// contract to "disputed", records the reason, notifies the other party, and
// opens a ticket in the request/dispute center so the team can track it.
export async function raiseDispute(contractId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = (formData.get("reason") as string)?.trim() || "";

  const { data: contract } = await supabase
    .from("contracts")
    .select("client_id, freelancer_id, title")
    .eq("id", contractId)
    .single();
  if (
    !contract ||
    (contract.client_id !== user.id && contract.freelancer_id !== user.id)
  ) {
    redirect("/contracts");
  }

  await supabase
    .from("contracts")
    .update({
      status: "disputed",
      dispute_reason: reason,
      disputed_by: user.id,
      disputed_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  // Track the dispute in the request center.
  await openSupportTicket(supabase, {
    userId: user.id,
    subject: `Dispute — ${contract.title}`,
    category: "dispute",
    body: reason || "A dispute was opened on this contract.",
    contractId,
    attachments: parseAttachments(formData),
    ack: true,
  }).catch(() => null);

  const other =
    contract.client_id === user.id
      ? contract.freelancer_id
      : contract.client_id;
  await notify(
    supabase,
    other,
    "system",
    "A dispute was opened",
    `A dispute was opened on "${contract.title}". Our team will help resolve it.`,
    `/contracts/${contractId}`
  );

  redirect(`/contracts/${contractId}`);
}

// Resolve a dispute — returns the contract to active.
export async function resolveDispute(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("client_id, freelancer_id, title")
    .eq("id", contractId)
    .single();
  if (
    !contract ||
    (contract.client_id !== user.id && contract.freelancer_id !== user.id)
  ) {
    redirect("/contracts");
  }

  await supabase
    .from("contracts")
    .update({
      status: "active",
      dispute_reason: null,
      disputed_by: null,
      disputed_at: null,
    })
    .eq("id", contractId);

  const other =
    contract.client_id === user.id
      ? contract.freelancer_id
      : contract.client_id;
  await notify(
    supabase,
    other,
    "system",
    "Dispute resolved",
    `The dispute on "${contract.title}" was marked resolved. Work can continue.`,
    `/contracts/${contractId}`
  );

  redirect(`/contracts/${contractId}`);
}

// End a contract early. Rules (like Upwork):
//  • Freelancer ends → any escrow is refunded to the client immediately and
//    the contract completes.
//  • Client ends with NO escrow held → completes immediately.
//  • Client ends WHILE escrow is held → the contract does NOT close yet. The
//    freelancer gets a 7-day window to either accept the refund or open a
//    dispute (handled by closureRefund / closureDispute below).
export async function endContract(contractId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = ((formData.get("reason") as string) || "").trim();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, status")
    .eq("id", contractId)
    .single();
  if (
    !contract ||
    (contract.client_id !== user.id && contract.freelancer_id !== user.id) ||
    contract.status !== "active"
  ) {
    redirect(`/contracts/${contractId}`);
  }

  const isClient = user.id === contract.client_id;

  // How much escrow is held right now (funded but not released)?
  const { count: escrowCount } = await supabase
    .from("milestones")
    .select("*", { count: "exact", head: true })
    .eq("contract_id", contractId)
    .eq("payment_status", "funded");
  const hasEscrow = (escrowCount ?? 0) > 0;

  // Unfunded milestones always vanish on close.
  await supabase
    .from("milestones")
    .delete()
    .eq("contract_id", contractId)
    .is("payment_status", null);

  // Client ending with escrow held → open the freelancer's decision window.
  if (isClient && hasEscrow) {
    const deadline = new Date(
      Date.now() + CLOSURE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    await supabase
      .from("contracts")
      .update({
        pending_closure_by: user.id,
        closure_deadline: deadline,
      })
      .eq("id", contractId);

    await notify(
      supabase,
      contract.freelancer_id,
      "payment",
      "Client ended the contract — action needed",
      `The client ended "${contract.title}" while funds are still in escrow.${
        reason ? ` Reason: ${reason}.` : ""
      } You have ${CLOSURE_WINDOW_DAYS} days to either release the funds back to the client or open a dispute. If you do nothing, the funds are returned to the client.`,
      `/contracts/${contractId}`
    );
    await notify(
      supabase,
      contract.client_id,
      "system",
      "Contract ending — awaiting freelancer",
      `You ended "${contract.title}". Because funds are in escrow, ${contract.freelancer_id ? "the freelancer" : "they"} has ${CLOSURE_WINDOW_DAYS} days to accept the refund or open a dispute.`,
      `/contracts/${contractId}`
    );

    revalidatePath(`/contracts/${contractId}`);
    redirect(`/contracts/${contractId}`);
  }

  // Freelancer ending, or client ending with nothing in escrow → close now
  // (escrow, if any, returns to the client).
  await refundEscrowAndComplete(supabase, contract, {
    reason,
    byLabel: isClient ? "the client" : "the freelancer",
  });

  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}`);
}

// During the closure window, the freelancer releases the escrow back to the
// client and the contract completes.
export async function closureRefund(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, status, pending_closure_by")
    .eq("id", contractId)
    .single();
  // Only the freelancer, only while a closure window is open.
  if (
    !contract ||
    contract.freelancer_id !== user.id ||
    !contract.pending_closure_by ||
    contract.status !== "active"
  ) {
    redirect(`/contracts/${contractId}`);
  }

  await refundEscrowAndComplete(supabase, contract, {
    byLabel: "the freelancer (refund accepted)",
  });

  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}`);
}

// During the closure window, the freelancer opens a dispute instead of
// refunding. Escrow is frozen (kept funded) and a ticket opens in the
// dispute/request center for the team to resolve.
export async function closureDispute(contractId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = ((formData.get("reason") as string) || "").trim();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, status, pending_closure_by")
    .eq("id", contractId)
    .single();
  if (
    !contract ||
    contract.freelancer_id !== user.id ||
    !contract.pending_closure_by ||
    contract.status !== "active"
  ) {
    redirect(`/contracts/${contractId}`);
  }

  await supabase
    .from("contracts")
    .update({
      status: "disputed",
      dispute_reason: reason || "Freelancer disputed the contract closure.",
      disputed_by: user.id,
      disputed_at: new Date().toISOString(),
      // Clear the countdown — the dispute now governs the outcome; escrow
      // stays funded (frozen) until the dispute resolves.
      pending_closure_by: null,
      closure_deadline: null,
    })
    .eq("id", contractId);

  await openSupportTicket(supabase, {
    userId: user.id,
    subject: `Dispute — ${contract.title}`,
    category: "dispute",
    body:
      reason ||
      "The freelancer opened a dispute after the client ended the contract while funds were in escrow.",
    contractId,
    attachments: parseAttachments(formData),
    ack: true,
  }).catch(() => null);

  await notify(
    supabase,
    contract.client_id,
    "system",
    "Freelancer opened a dispute",
    `The freelancer opened a dispute on "${contract.title}". Our team will help both sides reach a fair outcome; escrow stays frozen until it's resolved.`,
    `/contracts/${contractId}`
  );

  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}`);
}

// Rehire a freelancer — starts a fresh contract with the same person.
export async function rehire(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: old } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (!old || old.client_id !== user.id) redirect("/contracts");

  const { data: created } = await supabase
    .from("contracts")
    .insert({
      job_id: old.job_id,
      client_id: old.client_id,
      freelancer_id: old.freelancer_id,
      title: `Rehire: ${old.title}`,
      amount: old.amount,
      status: "active",
      start_date: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (created) {
    await supabase.from("conversations").insert({
      contract_id: created.id,
      job_id: old.job_id,
      participant_1: old.client_id,
      participant_2: old.freelancer_id,
    });
    await notify(
      supabase,
      old.freelancer_id,
      "system",
      "You've been rehired",
      `You were rehired for "${old.title}".`,
      `/contracts/${created.id}`
    );
    redirect(`/contracts/${created.id}`);
  }
  redirect("/contracts");
}
