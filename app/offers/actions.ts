"use server";

import { createClient } from "@/lib/supabase-server";
import { identityBlocked } from "@/lib/identity";
import { notify } from "@/lib/notify";
import { postContractEvent } from "@/lib/chat-events";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Offer decline reasons — local const ("use server" files export async only).
const OFFER_DECLINE_REASONS = [
  "rate_low",
  "accepted_other",
  "timeline",
  "scope_mismatch",
  "milestone_structure",
  "other",
] as const;

export type OfferActionResult = {
  ok: boolean;
  error?: string;
  needsIdentity?: boolean;
  convoId?: string;
  contractId?: string;
};

/* ------------------------------------------------------------------ */
/* Send (client)                                                        */
/* ------------------------------------------------------------------ */

// Client sends a formal job offer — either from a job's proposal ("Send
// offer" button) or as a direct offer. Creates the offer contract, opens the
// chat with an offer card, and notifies the freelancer.
export async function sendOffer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const freelancerId = (formData.get("freelancer_id") as string) || "";
  const jobId = ((formData.get("job_id") as string) || "").trim() || null;
  const proposalId =
    ((formData.get("proposal_id") as string) || "").trim() || null;
  const title = ((formData.get("title") as string) || "").trim();
  const amount = Number(formData.get("amount")) || 0;
  const rateType =
    (formData.get("rate_type") as string) === "hourly" ? "hourly" : "fixed";
  const deadline = ((formData.get("deadline") as string) || "").trim() || null;
  const duration = ((formData.get("duration") as string) || "").trim() || null;
  const expiresAt =
    ((formData.get("expires_at") as string) || "").trim() || null;
  const description = ((formData.get("description") as string) || "").trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let milestones: any[] = [];
  try {
    milestones = JSON.parse((formData.get("milestones") as string) || "[]");
  } catch {}
  milestones = milestones.filter(
    (m) => (m?.name || "").trim() && Number(m?.amount) > 0
  );

  // Separator depends on whether the base path already has a query string.
  const back = jobId
    ? `/jobs/${jobId}?tab=proposals&offererror=1`
    : "/offers?offererror=1";
  if (!freelancerId || !title || !description || amount <= 0) {
    redirect(back);
  }

  // If tied to a job, only the job's owner can send the offer.
  if (jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("client_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!job || job.client_id !== user.id) redirect(`/jobs/${jobId}`);
  }

  // One pending offer per freelancer+job at a time.
  let dupQuery = supabase
    .from("contracts")
    .select("id")
    .eq("client_id", user.id)
    .eq("freelancer_id", freelancerId)
    .eq("status", "offer");
  if (jobId) dupQuery = dupQuery.eq("job_id", jobId);
  const { data: dup } = await dupQuery.limit(1).maybeSingle();
  if (dup) redirect(jobId ? `/jobs/${jobId}?tab=hire&sub=offers` : "/offers");

  const { data: offer } = await supabase
    .from("contracts")
    .insert({
      client_id: user.id,
      freelancer_id: freelancerId,
      job_id: jobId,
      proposal_id: proposalId,
      title,
      amount,
      rate_type: rateType,
      end_date: deadline,
      contract_duration: duration,
      offer_expires_at: expiresAt,
      client_message: description,
      offer_milestones: milestones.length ? milestones : null,
      status: "offer",
    })
    .select("id")
    .single();
  if (!offer) redirect(back);

  // Chat: reuse the job conversation with this freelancer if there is one,
  // otherwise create one, then drop the offer card into it.
  let convoId: string | undefined;
  {
    let q = supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${freelancerId}),and(participant_1.eq.${freelancerId},participant_2.eq.${user.id})`
      );
    if (jobId) q = q.eq("job_id", jobId);
    else q = q.is("job_id", null);
    const { data: existing } = await q.limit(1).maybeSingle();
    convoId = existing?.id;
    if (!convoId) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({
          job_id: jobId,
          participant_1: user.id,
          participant_2: freelancerId,
        })
        .select("id")
        .single();
      convoId = created?.id;
    }
  }
  if (convoId) {
    // Seed the freelancer's cover letter first so a brand-new conversation
    // opens with their proposal (like the Message-button flow).
    if (jobId) {
      const { seedProposalIntroMessage } = await import("@/lib/chat-seed");
      await seedProposalIntroMessage(convoId, jobId, freelancerId);
    }
    try {
      // The offer card message — content carries the live status so realtime
      // UPDATE events flip the card in place.
      await supabase.from("messages").insert({
        conversation_id: convoId,
        sender_id: user.id,
        kind: "offer",
        offer_id: offer.id,
        content: "pending",
      });
    } catch {
      /* pre-migration (no kind column) — offer still works via pages */
    }
  }

  // If this offer answers a freelancer's contract proposal, mark the request
  // as answered and flip its chat card in place (realtime UPDATE).
  const requestId =
    ((formData.get("request_id") as string) || "").trim() || null;
  if (requestId) {
    try {
      await supabase
        .from("contract_requests")
        .update({ status: "offer_sent", responded_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("client_id", user.id);
      await supabase
        .from("messages")
        .update({ content: "offer_sent" })
        .eq("request_id", requestId)
        .eq("kind", "contract_request");
    } catch {
      /* pre-migration — the offer itself still went out */
    }
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  await notify(
    supabase,
    freelancerId,
    "offer",
    `🎉 You received a job offer from ${me?.full_name || "a client"}!`,
    `"${title}" — $${amount} ${rateType === "hourly" ? "/hr" : "fixed"}. Review the details and respond.`,
    `/freelancer/offers/${offer.id}`
  );

  revalidatePath("/offers");
  redirect(jobId ? `/jobs/${jobId}?tab=hire&sub=offers&offered=1` : "/offers");
}

/* ------------------------------------------------------------------ */
/* Accept (freelancer)                                                  */
/* ------------------------------------------------------------------ */

// Freelancer accepts a pending offer → active contract, milestones created,
// chat system note, offer card flipped, both parties notified.
export async function acceptOffer(
  contractId: string
): Promise<OfferActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  if (await identityBlocked()) {
    return {
      ok: false,
      needsIdentity: true,
      error: "Verify your identity before accepting offers.",
    };
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, jobs ( id, title )")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract || contract.freelancer_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (contract.status !== "offer") {
    return { ok: false, error: "This offer has already been responded to." };
  }
  if (
    contract.offer_expires_at &&
    new Date(contract.offer_expires_at).getTime() < Date.now()
  ) {
    return { ok: false, error: "This offer has expired and can no longer be accepted." };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("contracts")
    .update({ status: "active", start_date: now, responded_at: now })
    .eq("id", contractId)
    .eq("freelancer_id", user.id);
  if (updErr) return { ok: false, error: "Couldn't accept the offer. Try again." };

  // Linked proposal → hired.
  if (contract.proposal_id) {
    await supabase
      .from("proposals")
      .update({ status: "accepted" })
      .eq("id", contract.proposal_id);
  }

  // Materialize offer milestones into real milestone rows.
  if (Array.isArray(contract.offer_milestones)) {
    for (const m of contract.offer_milestones) {
      const name = (m?.name || "").trim();
      const amt = Number(m?.amount) || 0;
      if (!name || amt <= 0) continue;
      await supabase.from("milestones").insert({
        contract_id: contractId,
        job_id: contract.job_id,
        proposal_id: contract.proposal_id,
        title: name,
        amount: amt,
        due_date: m?.due_date || null,
        status: "pending",
      });
    }
  }

  // Conversation: contract → job pair → create.
  const convoId = await ensureOfferConversation(supabase, contract, user.id);

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const freelancerName = me?.full_name || "The freelancer";

  if (convoId) {
    try {
      await supabase.from("messages").insert({
        conversation_id: convoId,
        sender_id: user.id,
        kind: "system",
        content: `✅ ${freelancerName} has accepted the offer. Contract has started for "${contract.title}".`,
      });
      // Flip the offer card in place (realtime UPDATE).
      await supabase
        .from("messages")
        .update({ content: "accepted" })
        .eq("offer_id", contractId)
        .eq("kind", "offer");
    } catch {
      /* pre-migration — skip chat extras */
    }
  }

  // Both sides notified (in-app + email via notify()).
  await notify(
    supabase,
    user.id,
    "offer",
    `✅ You accepted the offer for "${contract.title}"`,
    `Your contract with the client has started! Head to the contract to begin.`,
    `/contracts/${contractId}`
  );
  await notify(
    supabase,
    contract.client_id,
    "offer",
    `🎉 ${freelancerName} accepted your offer for "${contract.title}"!`,
    "The contract is now active. Fund the first milestone to get things moving.",
    `/contracts/${contractId}`
  );

  revalidatePath("/freelancer");
  revalidatePath("/offers");
  revalidatePath("/contracts");
  return { ok: true, convoId: convoId ?? undefined, contractId };
}

/* ------------------------------------------------------------------ */
/* Decline (freelancer)                                                 */
/* ------------------------------------------------------------------ */

// Freelancer declines a pending offer with a reason. The reason is stored for
// Xwork only — the client just gets a soft "not available" note.
export async function declineOffer(
  contractId: string,
  reason?: string,
  customReason?: string
): Promise<OfferActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract || contract.freelancer_id !== user.id) {
    return { ok: false, error: "Offer not found." };
  }
  if (contract.status !== "offer") {
    return { ok: false, error: "This offer has already been responded to." };
  }

  const r = (reason || "").trim();
  const custom = (customReason || "").trim();
  if (!OFFER_DECLINE_REASONS.includes(r as (typeof OFFER_DECLINE_REASONS)[number])) {
    return { ok: false, error: "Please select a reason for declining." };
  }
  if (r === "other" && custom.length < 10) {
    return { ok: false, error: "Please tell us a bit more (at least 10 characters)." };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("contracts")
    .update({
      status: "declined",
      decline_reason: r,
      decline_reason_custom: r === "other" ? custom : null,
      responded_at: now,
    })
    .eq("id", contractId)
    .eq("freelancer_id", user.id);
  if (updErr) return { ok: false, error: "Couldn't decline the offer. Try again." };

  const convoId = await ensureOfferConversation(supabase, contract, user.id);

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const freelancerName = me?.full_name || "The freelancer";

  if (convoId) {
    try {
      // Reason is deliberately NOT included — the client never sees it.
      await supabase.from("messages").insert({
        conversation_id: convoId,
        sender_id: user.id,
        kind: "system",
        content: `❌ ${freelancerName} has declined the offer for "${contract.title}".`,
      });
      await supabase
        .from("messages")
        .update({ content: "declined" })
        .eq("offer_id", contractId)
        .eq("kind", "offer");
    } catch {
      /* pre-migration — skip chat extras */
    }
  }

  await notify(
    supabase,
    user.id,
    "offer",
    `You declined the offer for "${contract.title}"`,
    "Your reason was recorded. Keep browsing — more matching jobs are out there.",
    "/freelancer?tab=offers"
  );
  await notify(
    supabase,
    contract.client_id,
    "offer",
    `${freelancerName} has declined your offer for "${contract.title}"`,
    "They may not be available right now. You can find other great freelancers among your proposals.",
    contract.job_id ? `/jobs/${contract.job_id}?tab=proposals` : "/offers"
  );

  revalidatePath("/freelancer");
  revalidatePath("/offers");
  return { ok: true, contractId };
}

/* ------------------------------------------------------------------ */
/* Cancel (client) + shared helper                                      */
/* ------------------------------------------------------------------ */

// Client cancels their own pending offer (from the /offers page).
export async function cancelOffer(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, status, job_id")
    .eq("id", contractId)
    .maybeSingle();
  if (contract && contract.client_id === user.id && contract.status === "offer") {
    await supabase
      .from("contracts")
      .update({
        status: "declined",
        decline_reason: "cancelled_by_client",
        responded_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .eq("client_id", user.id);
    try {
      await supabase
        .from("messages")
        .update({ content: "declined" })
        .eq("offer_id", contractId)
        .eq("kind", "offer");
    } catch {
      /* pre-migration */
    }
    await notify(
      supabase,
      contract.freelancer_id,
      "offer",
      "An offer was withdrawn by the client",
      `The offer "${contract.title}" is no longer available.`,
      "/freelancer?tab=offers"
    );
    await postContractEvent(
      supabase,
      contract,
      user.id,
      `↩️ The client withdrew the offer for "${contract.title}".`
    );
  }
  redirect("/offers");
}

// Opens the chat room for an offer (creates it if needed) — used by the
// "Open Chat with Client" button on the offer detail page.
export async function openOfferChat(contractId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, job_id, client_id, freelancer_id")
    .eq("id", contractId)
    .maybeSingle();
  if (
    !contract ||
    (contract.freelancer_id !== user.id && contract.client_id !== user.id)
  ) {
    redirect("/messages");
  }

  const convoId = await ensureOfferConversation(supabase, contract, user.id);
  redirect(convoId ? `/messages/${convoId}` : "/messages");
}

// Find (or create) the conversation for an offer: by contract, then by the
// job+pair, then a fresh one. Also links the conversation to the contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureOfferConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: any,
  userId: string
): Promise<string | null> {
  const other =
    contract.client_id === userId ? contract.freelancer_id : contract.client_id;

  const { data: byContract } = await supabase
    .from("conversations")
    .select("id")
    .eq("contract_id", contract.id)
    .limit(1)
    .maybeSingle();
  if (byContract) return byContract.id;

  let q = supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${other}),and(participant_1.eq.${other},participant_2.eq.${userId})`
    );
  if (contract.job_id) q = q.eq("job_id", contract.job_id);
  const { data: byPair } = await q.limit(1).maybeSingle();
  if (byPair) {
    await supabase
      .from("conversations")
      .update({ contract_id: contract.id })
      .eq("id", byPair.id);
    return byPair.id;
  }

  const { data: created } = await supabase
    .from("conversations")
    .insert({
      contract_id: contract.id,
      job_id: contract.job_id ?? null,
      participant_1: contract.client_id,
      participant_2: contract.freelancer_id,
    })
    .select("id")
    .single();
  return created?.id ?? null;
}
