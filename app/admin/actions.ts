"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// All admin actions re-check is_admin server-side — never trust the UI alone.
async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) redirect("/dashboard");
  return { supabase, adminId: user.id };
}

// Suspend an account (with a reason) and notify the user.
export async function adminSuspendUser(userId: string, formData: FormData) {
  const { supabase } = await ensureAdmin();
  const reason =
    (formData.get("reason") as string)?.trim() ||
    "Suspended by Xwork Trust & Safety for violating our terms.";

  // suspended/account_status are privileged, DB-trigger-protected columns; the
  // admin writes them through the service-role client (which also bypasses the
  // owner-scoped RLS that would block updating another user's row).
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      suspended: true,
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
      account_status: "suspended", // enforced by proxy + health hard cap
    })
    .eq("id", userId);

  // Account health: manual suspension = -50 critical violation + score cap.
  try {
    const { addViolation } = await import("@/lib/health");
    await addViolation({
      userId,
      type: "admin_suspension",
      description: reason,
    });
  } catch {
    /* best-effort */
  }

  // Free the person's verified identity so they may re-verify a new account
  // (up to the internal lifetime cap).
  await supabase.rpc("release_identity", { p_user_id: userId });

  await notify(
    supabase,
    userId,
    "account",
    "Your Xwork account has been suspended",
    `${reason} If you believe this was a mistake, please contact our support team.`,
    "/profile"
  );

  revalidatePath("/admin");
  redirect("/admin");
}

// Lift a suspension and reset the user's warning count.
export async function adminReinstateUser(userId: string) {
  const { supabase } = await ensureAdmin();

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      suspended: false,
      suspended_at: null,
      suspension_reason: null,
      warnings: 0,
      account_status: "active",
    })
    .eq("id", userId);

  // Account health: lifting the suspension resolves the suspension violation
  // and removes the score cap immediately.
  try {
    const { createAdminClient } = await import("@/lib/supabase-admin");
    const { recalcHealth } = await import("@/lib/health");
    await createAdminClient()
      .from("violations")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("violation_type", "admin_suspension")
      .in("status", ["active", "under_review"]);
    await recalcHealth(userId, "suspension_lifted");
  } catch {
    /* best-effort */
  }

  await notify(
    supabase,
    userId,
    "account",
    "Your Xwork account has been reinstated",
    "Your account is active again and your policy warnings have been cleared. Please keep all chat and payments on Xwork.",
    "/dashboard"
  );

  revalidatePath("/admin");
  redirect("/admin");
}

// Clear warnings without changing suspension state (e.g. an accepted appeal).
export async function adminClearWarnings(userId: string) {
  await ensureAdmin();
  const admin = createAdminClient();
  await admin.from("profiles").update({ warnings: 0 }).eq("id", userId);
  revalidatePath("/admin");
  redirect("/admin");
}

// Resolve a contract dispute from the admin queue.
export async function adminResolveDispute(contractId: string) {
  const { supabase } = await ensureAdmin();

  const { data: contract } = await supabase
    .from("contracts")
    .select("client_id, freelancer_id, title")
    .eq("id", contractId)
    .single();

  await supabase
    .from("contracts")
    .update({
      status: "active",
      dispute_reason: null,
      disputed_by: null,
      disputed_at: null,
    })
    .eq("id", contractId);

  if (contract) {
    for (const uid of [contract.client_id, contract.freelancer_id]) {
      await notify(
        supabase,
        uid,
        "system",
        "Dispute resolved by Xwork",
        `Our Trust & Safety team resolved the dispute on "${contract.title}". Work can continue.`,
        `/contracts/${contractId}`
      );
    }
  }

  revalidatePath("/admin");
  redirect("/admin");
}
