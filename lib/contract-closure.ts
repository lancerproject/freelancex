// Shared contract-closure settlement. When a contract closes, any escrow that
// was never released goes back to the client (milestones marked "returned",
// which lib/earnings excludes from pending), the contract completes, and the
// closure window is cleared. Plain module — callers pass a Supabase client.

import { notify } from "./notify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Contract = any;

export async function refundEscrowAndComplete(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contract: Contract,
  opts?: { reason?: string; byLabel?: string; notifyParties?: boolean }
): Promise<void> {
  // Unfunded milestones vanish; funded-but-unreleased escrow returns to client.
  await supabase
    .from("milestones")
    .delete()
    .eq("contract_id", contract.id)
    .is("payment_status", null);
  await supabase
    .from("milestones")
    .update({ payment_status: "returned" })
    .eq("contract_id", contract.id)
    .eq("payment_status", "funded");

  await supabase
    .from("contracts")
    .update({
      status: "completed",
      end_date: new Date().toISOString(),
      pending_closure_by: null,
      closure_deadline: null,
    })
    .eq("id", contract.id);

  if (opts?.notifyParties !== false) {
    const msg = `"${contract.title}" has ended.${
      opts?.byLabel ? ` Ended by ${opts.byLabel}.` : ""
    }${opts?.reason ? ` Reason: ${opts.reason}.` : ""} Any escrow that wasn't released has been returned to the client. You can now leave feedback for each other.`;
    await notify(
      supabase,
      contract.freelancer_id,
      "system",
      "Contract ended",
      msg,
      `/contracts/${contract.id}`
    );
    await notify(
      supabase,
      contract.client_id,
      "system",
      "Contract ended",
      msg,
      `/contracts/${contract.id}`
    );
  }

  try {
    const { recalcHealth } = await import("./health");
    await recalcHealth(contract.freelancer_id, "job_completed");
  } catch {
    /* best-effort */
  }
}
