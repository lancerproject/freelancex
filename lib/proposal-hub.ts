// Proposal hub — one place that gathers everything the freelancer's proposal
// surfaces need: job offers, active candidates, client invites, active and
// archived proposals, with counts. Used by the My Proposals page (tabs) and
// the dashboard proposals summary so the two never disagree.
//
// "Active candidate" is COMPUTED live (client viewed the proposal AND has
// messaged the freelancer about that job, no pending offer, job still open) —
// nothing is stored, so it can never go stale.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type OfferStatus = "pending" | "accepted" | "declined" | "expired";

export type HubOffer = {
  id: string;
  title: string;
  amount: number;
  rateType: "fixed" | "hourly";
  status: OfferStatus;
  clientId: string | null;
  clientName: string;
  clientVerified: boolean;
  jobId: string | null;
  deadline: string | null; // contracts.end_date
  duration: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  milestones: { name: string; amount: number; due_date?: string | null }[];
};

export type HubCandidate = {
  proposalId: string;
  jobId: string;
  jobTitle: string;
  clientId: string;
  clientName: string;
  clientVerified: boolean;
  conversationId: string;
  firstMessagePreview: string;
  lastMessageAt: string | null;
  bidAmount: number;
  proposalStatus: string; // 'pending' | 'shortlisted'
};

export type HubInvite = {
  id: string;
  jobId: string | null;
  jobTitle: string;
  jobType: string; // 'fixed' | 'hourly'
  budget: number | null;
  clientId: string | null;
  clientName: string;
  clientVerified: boolean;
  status: "pending" | "accepted" | "declined";
  sentAt: string | null;
};

export type HubArchived = {
  proposalId: string;
  jobId: string | null;
  jobTitle: string;
  clientName: string;
  bidAmount: number;
  submittedAt: string | null;
  archivedAt: string | null;
  reason: "withdrawn" | "job_closed" | "not_selected";
  withdrawalReason: string | null;
  withdrawalReasonCustom: string | null;
  jobExists: boolean;
};

export type ProposalHub = {
  offers: HubOffer[];
  pendingOffers: HubOffer[];
  candidates: HubCandidate[];
  invites: HubInvite[];
  pendingInvites: HubInvite[];
  active: any[]; // submitted proposals on open jobs (raw rows w/ jobs join)
  hired: any[]; // accepted proposals (raw rows w/ jobs join)
  archived: HubArchived[];
  counts: {
    active: number;
    candidates: number;
    invites: number;
    offers: number;
    archived: number;
    pendingOffers: number;
    pendingInvites: number;
  };
};

const jobOpen = (job: any) => !job?.status || job.status === "open";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export function offerIsExpired(o: {
  status?: string | null;
  offer_expires_at?: string | null;
}): boolean {
  return (
    o.status === "offer" &&
    !!o.offer_expires_at &&
    new Date(o.offer_expires_at).getTime() < Date.now()
  );
}

export function offerStatusOf(o: any): OfferStatus {
  if (o.status === "offer") return offerIsExpired(o) ? "expired" : "pending";
  if (o.status === "declined") return "declined";
  return "accepted"; // active / completed etc. after acceptance
}

export async function getProposalHub(
  supabase: any,
  userId: string
): Promise<ProposalHub> {
  const [
    { data: proposalsData },
    { data: offerRows },
    { data: inviteRows },
    { data: convoRows },
  ] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        "*, jobs (id, title, budget, status, job_type, client_id, client:profiles!client_id (id, full_name, payment_verified))"
      )
      .eq("freelancer_id", userId)
      .order("created_at", { ascending: false }),
    // Offer-lifecycle contracts: pending offers, declined offers, and accepted
    // offers (responded_at is only ever set by the offer accept/decline flow —
    // direct hires never have it).
    supabase
      .from("contracts")
      .select(
        "*, jobs (id, title, status), client:profiles!client_id (id, full_name, payment_verified)"
      )
      .eq("freelancer_id", userId)
      .or("status.eq.offer,status.eq.declined,responded_at.not.is.null")
      .order("created_at", { ascending: false }),
    supabase
      .from("invites")
      .select(
        "*, jobs (id, title, budget, job_type, status), client:profiles!client_id (id, full_name, payment_verified)"
      )
      .eq("freelancer_id", userId)
      .order("sent_at", { ascending: false }),
    // Job conversations this freelancer is part of (candidate signal).
    supabase
      .from("conversations")
      .select("id, job_id, participant_1, participant_2")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .not("job_id", "is", null),
  ]);

  const proposals: any[] = proposalsData ?? [];

  // ---- Offers ---------------------------------------------------------------
  const offers: HubOffer[] = (offerRows ?? []).map((o: any) => {
    const job = one<any>(o.jobs);
    const client = one<any>(o.client);
    let milestones: HubOffer["milestones"] = [];
    if (Array.isArray(o.offer_milestones)) milestones = o.offer_milestones;
    return {
      id: o.id,
      title: o.title || job?.title || "Job offer",
      amount: Number(o.amount) || 0,
      rateType: o.rate_type === "hourly" ? "hourly" : "fixed",
      status: offerStatusOf(o),
      clientId: client?.id ?? null,
      clientName: client?.full_name || "Client",
      clientVerified: !!client?.payment_verified,
      jobId: job?.id ?? o.job_id ?? null,
      deadline: o.end_date ?? null,
      duration: o.contract_duration ?? null,
      expiresAt: o.offer_expires_at ?? null,
      sentAt: o.created_at ?? null,
      respondedAt: o.responded_at ?? null,
      milestones,
    };
  });
  const pendingOffers = offers.filter((o) => o.status === "pending");

  // ---- Active candidates ------------------------------------------------------
  // Candidate proposals: still open, viewed by the client, job open, and no
  // pending offer on the same job.
  const pendingOfferJobIds = new Set(
    pendingOffers.map((o) => o.jobId).filter(Boolean)
  );
  const candidateBase = proposals.filter((p) => {
    const job = one<any>(p.jobs);
    return (
      (p.status === "pending" || p.status === "shortlisted") &&
      p.viewed_at &&
      jobOpen(job) &&
      !pendingOfferJobIds.has(job?.id)
    );
  });

  const convosByJob: Record<string, any> = {};
  for (const c of convoRows ?? []) {
    if (c.job_id) convosByJob[c.job_id] = c;
  }

  const candidates: HubCandidate[] = [];
  const candidateConvos = candidateBase
    .map((p) => ({ p, convo: convosByJob[one<any>(p.jobs)?.id] }))
    .filter((x) => x.convo);

  if (candidateConvos.length > 0) {
    // One query for all client messages across the candidate conversations.
    const convoIds = candidateConvos.map((x) => x.convo.id);
    const { data: msgRows } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, content, created_at, kind")
      .in("conversation_id", convoIds)
      .neq("sender_id", userId)
      .order("created_at", { ascending: true });
    const byConvo: Record<string, any[]> = {};
    for (const m of msgRows ?? []) {
      // Only real client messages count — not offer cards or system notices.
      if (m.kind && m.kind !== "text" && m.kind !== "attachment") continue;
      (byConvo[m.conversation_id] ??= []).push(m);
    }
    for (const { p, convo } of candidateConvos) {
      const msgs = byConvo[convo.id] ?? [];
      if (msgs.length === 0) continue; // viewed but never messaged → not a candidate
      const job = one<any>(p.jobs);
      const client = one<any>(job?.client);
      const first = msgs[0];
      const last = msgs[msgs.length - 1];
      candidates.push({
        proposalId: p.id,
        jobId: job?.id,
        jobTitle: job?.title || "Job",
        clientId: client?.id ?? job?.client_id,
        clientName: client?.full_name || "Client",
        clientVerified: !!client?.payment_verified,
        conversationId: convo.id,
        firstMessagePreview:
          (first?.content || "").slice(0, 80) +
          ((first?.content || "").length > 80 ? "…" : ""),
        lastMessageAt: last?.created_at ?? null,
        bidAmount: Number(p.bid_amount) || 0,
        proposalStatus: p.status,
      });
    }
    candidates.sort((a, b) =>
      (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "")
    );
  }

  // ---- Invites ----------------------------------------------------------------
  const invites: HubInvite[] = (inviteRows ?? []).map((i: any) => {
    const job = one<any>(i.jobs);
    const client = one<any>(i.client);
    return {
      id: i.id,
      jobId: job?.id ?? i.job_id ?? null,
      jobTitle: job?.title || "Job",
      jobType: job?.job_type === "hourly" ? "hourly" : "fixed",
      budget: job?.budget != null ? Number(job.budget) : null,
      clientId: client?.id ?? null,
      clientName: client?.full_name || "Client",
      clientVerified: !!client?.payment_verified,
      status: (i.status ?? "pending") as HubInvite["status"],
      sentAt: i.sent_at ?? null,
    };
  });
  const pendingInvites = invites.filter((i) => i.status === "pending");

  // ---- Active & hired -----------------------------------------------------------
  const active = proposals.filter((p) => {
    const job = one<any>(p.jobs);
    return (
      (p.status === "pending" || p.status === "shortlisted") && jobOpen(job)
    );
  });
  const hired = proposals.filter((p) => p.status === "accepted");

  // ---- Archived -------------------------------------------------------------------
  const archived: HubArchived[] = [];
  for (const p of proposals) {
    const job = one<any>(p.jobs);
    const client = one<any>(job?.client);
    if (p.status === "withdrawn") {
      archived.push({
        proposalId: p.id,
        jobId: job?.id ?? null,
        jobTitle: job?.title || "Job",
        clientName: client?.full_name || "Client",
        bidAmount: Number(p.bid_amount) || 0,
        submittedAt: p.created_at ?? null,
        archivedAt: p.withdrawn_at ?? p.created_at ?? null,
        reason: "withdrawn",
        withdrawalReason: p.withdrawal_reason ?? null,
        withdrawalReasonCustom: p.withdrawal_reason_custom ?? null,
        jobExists: !!job?.id,
      });
    } else if (
      (p.status === "pending" || p.status === "shortlisted") &&
      !jobOpen(job)
    ) {
      archived.push({
        proposalId: p.id,
        jobId: job?.id ?? null,
        jobTitle: job?.title || "Job",
        clientName: client?.full_name || "Client",
        bidAmount: Number(p.bid_amount) || 0,
        submittedAt: p.created_at ?? null,
        archivedAt: p.created_at ?? null,
        reason: job?.status === "awarded" ? "not_selected" : "job_closed",
        withdrawalReason: null,
        withdrawalReasonCustom: null,
        jobExists: !!job?.id,
      });
    } else if (p.status === "rejected") {
      archived.push({
        proposalId: p.id,
        jobId: job?.id ?? null,
        jobTitle: job?.title || "Job",
        clientName: client?.full_name || "Client",
        bidAmount: Number(p.bid_amount) || 0,
        submittedAt: p.created_at ?? null,
        archivedAt: p.created_at ?? null,
        reason: "not_selected",
        withdrawalReason: null,
        withdrawalReasonCustom: null,
        jobExists: !!job?.id,
      });
    }
  }
  archived.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));

  return {
    offers,
    pendingOffers,
    candidates,
    invites,
    pendingInvites,
    active,
    hired,
    archived,
    counts: {
      active: active.length + hired.length,
      candidates: candidates.length,
      invites: invites.length,
      offers: offers.length,
      archived: archived.length,
      pendingOffers: pendingOffers.length,
      pendingInvites: pendingInvites.length,
    },
  };
}
