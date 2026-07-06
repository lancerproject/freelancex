"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getFreelancerEarnings } from "@/lib/earnings";
import { getMembership } from "@/lib/membership";

// Closes (deactivates) the user's account. Requires:
//  1. No pending proposals (they must be withdrawn first).
//  2. No active/disputed contracts (they must be ended first).
//  3. No un-withdrawn available balance (withdraw it first).
//  4. The correct account password.
export async function closeAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") || "");

  // 1 + 2: re-check the preconditions server-side (authoritative).
  const { count: pendingProposals } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("freelancer_id", user.id)
    .eq("status", "pending");

  const { count: activeContracts } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .or(`freelancer_id.eq.${user.id},client_id.eq.${user.id}`)
    .in("status", ["active", "disputed"]);

  if ((pendingProposals ?? 0) > 0 || (activeContracts ?? 0) > 0) {
    redirect("/settings/close-account?error=conditions");
  }

  // 3: don't let funds get orphaned — the balance must be withdrawn first.
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const earnings = await getFreelancerEarnings(
    supabase,
    user.id,
    getMembership(prof).plan
  );
  if (earnings.available > 0) {
    redirect("/settings/close-account?error=balance");
  }

  // 4: verify the password by attempting a sign-in with it.
  const { error: pwErr } = await supabase.auth.signInWithPassword({
    email: user.email || "",
    password,
  });
  if (pwErr) {
    redirect("/settings/close-account?error=password");
  }

  // Soft-close: mark the account closed, then sign out. A closed account
  // can't sign back in (enforced in the login flow).
  await supabase
    .from("profiles")
    .update({ closed: true })
    .eq("id", user.id);

  await supabase.auth.signOut();
  redirect("/login?closed=1");
}
