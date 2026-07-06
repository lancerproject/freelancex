"use server";

import { createClient } from "@/lib/supabase-server";
import { notify } from "@/lib/notify";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Valid decline reasons — local const ("use server" files export async only).
const DECLINE_REASONS = [
  "skills_mismatch",
  "budget_low",
  "not_available",
  "not_interested",
  "unclear_description",
  "other",
] as const;

// Freelancer accepts an invite → marked accepted, then they go straight to
// the standard proposal form for that job (the form links back to the invite
// so submission can finish the flow: chat room + notification).
export async function acceptInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invite } = await supabase
    .from("invites")
    .select("id, job_id, freelancer_id, status")
    .eq("id", inviteId)
    .maybeSingle();
  if (!invite || invite.freelancer_id !== user.id) redirect("/freelancer");
  if (invite.status !== "pending") redirect(`/invites/${inviteId}`);

  await supabase
    .from("invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("freelancer_id", user.id);

  revalidatePath("/freelancer");
  redirect(`/jobs/${invite.job_id}/proposal?invite=${inviteId}`);
}

// Freelancer declines an invite with a reason (never shown to the client) and
// optionally blocks future invites from this client.
export async function declineInvite(
  inviteId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = ((formData.get("reason") as string) || "").trim();
  const custom = ((formData.get("custom") as string) || "").trim();
  const block = (formData.get("future") as string) === "block";

  const { data: invite } = await supabase
    .from("invites")
    .select(
      "id, job_id, client_id, freelancer_id, status, jobs ( title ), client:profiles!client_id ( full_name )"
    )
    .eq("id", inviteId)
    .maybeSingle();
  if (!invite || invite.freelancer_id !== user.id) redirect("/freelancer");
  if (invite.status !== "pending") redirect(`/invites/${inviteId}`);

  // Validation mirrors the page's client-side gating.
  if (!DECLINE_REASONS.includes(reason as (typeof DECLINE_REASONS)[number])) {
    redirect(`/invites/${inviteId}/decline?error=reason`);
  }
  if (reason === "other" && custom.length < 10) {
    redirect(`/invites/${inviteId}/decline?error=custom`);
  }

  await supabase
    .from("invites")
    .update({
      status: "declined",
      decline_reason: reason,
      decline_reason_custom: reason === "other" ? custom : null,
      declined_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("freelancer_id", user.id);

  if (block && invite.client_id) {
    // Upsert-style: the unique(freelancer_id, client_id) makes re-blocking safe.
    await supabase
      .from("client_invite_blocks")
      .upsert(
        { freelancer_id: user.id, client_id: invite.client_id },
        { onConflict: "freelancer_id,client_id" }
      );
  }

  // Soft notification to the client — the reason is NEVER shared.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(invite.jobs) ? invite.jobs[0] : invite.jobs;
  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  await notify(
    supabase,
    invite.client_id,
    "invite",
    `${me?.full_name || "The freelancer"} is not available for "${job?.title ?? "your job"}"`,
    "They passed on this invite. You can invite other great freelancers from your job's Invite tab.",
    `/jobs/${invite.job_id}?tab=invite`
  );

  revalidatePath("/freelancer");
  redirect(`/invites/${inviteId}/declined${block ? "?blocked=1" : ""}`);
}

// Unblock a client from Settings > Blocked Clients.
export async function unblockClient(clientId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("client_invite_blocks")
    .delete()
    .eq("freelancer_id", user.id)
    .eq("client_id", clientId);

  revalidatePath("/settings/blocked-clients");
}
