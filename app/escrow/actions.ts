"use server";

// Thin, authorized wrappers over the locked escrow DB functions. Every money
// move happens inside a SECURITY DEFINER plpgsql function (see
// migrations/escrow-functions.sql) that locks the row and guards the
// transition; these wrappers only (1) authenticate + authorize the caller and
// (2) call the function via the service-role client. The functions are
// EXECUTE-revoked from anon/authenticated (see escrow-grants.sql), so they can
// ONLY be reached through this vetted path — a user can't call rpc() directly
// with someone else's ids.

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { gateway } from "@/lib/escrow/gateway";

export type EscrowResult = { ok: boolean; error?: string; id?: string };

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Load a milestone + its contract parties (service role; authorization is
// enforced by the caller before any state change).
async function loadMilestone(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await admin
    .from("milestones")
    .select("id, amount, escrow_status, contract_id, contracts:contract_id ( client_id, freelancer_id, title )")
    .eq("id", id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (data as any)?.contracts;
  return data
    ? { ...data, clientId: c?.client_id, freelancerId: c?.freelancer_id, title: c?.title }
    : null;
}

// ---- Client funds a milestone (money IN via the gateway, then ledger) ----
export async function fundMilestone(milestoneId: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.clientId !== uid) return { ok: false, error: "Not allowed." };

  const idem = `fund:${milestoneId}`;
  // Pull money in first; only post to the ledger if the charge succeeds.
  const charged = await gateway.charge({
    userId: uid,
    amount: Number(m.amount), // milestone + client fee is computed server-side; sim ignores
    currency: "USD",
    methodToken: "sim",
    idempotencyKey: idem,
  });
  if (!charged.ok) return { ok: false, error: "Payment could not be collected." };

  const { error } = await admin.rpc("escrow_fund_milestone", {
    p_milestone: milestoneId,
    p_actor: uid,
    p_idem: idem,
  });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.freelancerId, "payment", "A milestone was funded",
    `The client funded a milestone on "${m.title}" — it's in escrow and safe to start.`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true };
}

// ---- Freelancer submits work (FUNDED -> IN_REVIEW) ----
export async function submitWork(milestoneId: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.freelancerId !== uid) return { ok: false, error: "Not allowed." };
  const { error } = await admin.rpc("escrow_submit_work", { p_milestone: milestoneId, p_actor: uid });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.clientId, "contract", "Work submitted for review",
    `Work was submitted on "${m.title}". Review and approve to release payment (auto-approves in 5 days).`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true };
}

// ---- Client approves (IN_REVIEW -> PENDING; freelancer fee cut here) ----
export async function approveMilestone(milestoneId: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.clientId !== uid) return { ok: false, error: "Not allowed." };
  const { error } = await admin.rpc("escrow_approve_milestone", {
    p_milestone: milestoneId, p_actor: uid, p_auto: false,
  });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.freelancerId, "payment", "Milestone approved — payment released",
    `Your work on "${m.title}" was approved. Your earnings (after the service fee) are clearing and will be withdrawable in 3 days.`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true };
}

// ---- Client rejects / requests changes (IN_REVIEW -> FUNDED) ----
export async function rejectMilestone(milestoneId: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.clientId !== uid) return { ok: false, error: "Not allowed." };
  const { error } = await admin.rpc("escrow_reject_milestone", { p_milestone: milestoneId, p_actor: uid });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.freelancerId, "contract", "Changes requested",
    `The client requested changes on "${m.title}". It's back to work-in-progress.`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true };
}

// ---- Client cancels a funded milestone (-> 7-day freelancer window) ----
export async function cancelMilestone(milestoneId: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.clientId !== uid) return { ok: false, error: "Not allowed." };
  const { error } = await admin.rpc("escrow_cancel_milestone", { p_milestone: milestoneId, p_actor: uid });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.freelancerId, "payment", "Client ended a milestone — action needed",
    `The client ended a milestone on "${m.title}". You have 7 days to release the funds back or open a dispute, or it auto-refunds.`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true };
}

// ---- Freelancer voluntarily refunds during the cancellation window ----
export async function refundMilestone(milestoneId: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.freelancerId !== uid) return { ok: false, error: "Not allowed." };
  const { error } = await admin.rpc("escrow_refund_milestone", { p_milestone: milestoneId, p_actor: uid, p_auto: false });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.clientId, "payment", "Refund on the way",
    `A milestone on "${m.title}" was refunded to your original payment method (arrives within 5 business days).`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true };
}

// ---- Freelancer opens a dispute during the cancellation window ----
export async function openDispute(milestoneId: string, reason: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const m = await loadMilestone(admin, milestoneId);
  if (!m || m.freelancerId !== uid) return { ok: false, error: "Not allowed." };
  const { data, error } = await admin.rpc("escrow_open_dispute", {
    p_milestone: milestoneId, p_actor: uid, p_reason: reason,
  });
  if (error) return { ok: false, error: error.message };
  await notify(admin, m.clientId, "system", "A dispute was opened",
    `A dispute was opened on "${m.title}". Our team will review it; the funds stay locked until it's resolved.`,
    `/contracts/${m.contract_id}`).catch(() => {});
  return { ok: true, id: data as string };
}

// ---- Admin resolves a dispute (release / refund / split) ----
export async function resolveDispute(
  disputeId: string,
  resolution: "release" | "refund" | "split",
  releaseAmount?: number,
  refundAmount?: number,
  note?: string
): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
  if (!me?.is_admin) return { ok: false, error: "Admins only." };
  const admin = createAdminClient();
  const { error } = await admin.rpc("escrow_resolve_dispute", {
    p_dispute: disputeId, p_admin: uid, p_resolution: resolution,
    p_release: releaseAmount ?? null, p_refund: refundAmount ?? null, p_note: note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---- Freelancer requests a withdrawal (money OUT via the gateway) ----
export async function requestWithdrawal(amount: number, method: string): Promise<EscrowResult> {
  const uid = await authed();
  if (!uid) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  const idem = `wd:${uid}:${Math.round(amount * 100)}:${method}`;
  // The DB function serializes per-user, checks the minimum + available
  // balance, and posts the ledger row atomically.
  const { data, error } = await admin.rpc("escrow_request_withdrawal", {
    p_actor: uid, p_amount: amount, p_method: method, p_min: 20, p_idem: idem,
  });
  if (error) return { ok: false, error: error.message };
  await notify(admin, uid, "payments", "Withdrawal requested",
    `Your withdrawal of $${amount.toFixed(2)} is processing and will arrive in 1–3 business days.`,
    `/withdraw`).catch(() => {});
  return { ok: true, id: data as string };
}
