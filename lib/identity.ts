import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { profileChecklist } from "@/lib/profile-completion";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Rule for whether identity verification is REQUIRED right now.
// For an unverified freelancer, it kicks in once ANY of these is true:
//   • their profile is 100% complete, OR
//   • it's been 2+ days since they created their profile, OR
//   • they've applied to at least 2 jobs, OR
//   • they have at least one contract.
// (So we never nag someone who just signed up and is still building.)
export async function computeIdentityRequired(
  supabase: ServerClient,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
): Promise<boolean> {
  if (profile?.role !== "freelancer" || profile?.id_verified) return false;

  // 1) Profile 100% complete.
  if (profileChecklist(profile).percent >= 100) return true;

  // 2) 2+ days after creating the profile.
  const twoDaysOld = profile?.created_at
    ? Date.now() - new Date(profile.created_at).getTime() > 2 * 86400000
    : false;
  if (twoDaysOld) return true;

  // 3) Applied to at least 2 jobs.
  const { count: proposalCount } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("freelancer_id", userId);
  if ((proposalCount ?? 0) >= 2) return true;

  // 4) Has at least one contract.
  const { count: contractCount } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("freelancer_id", userId);
  return (contractCount ?? 0) >= 1;
}

// Convenience wrapper used to gate applying, accepting contracts and
// withdrawals. Fetches the current user + profile, then applies the rule above.
export async function identityBlocked(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Own-row read via the service role — a `select("*")` as the authenticated
  // role is denied now that PII columns are revoked from it.
  const profile = await loadOwnProfile(user.id);

  return computeIdentityRequired(supabase, user.id, profile);
}
