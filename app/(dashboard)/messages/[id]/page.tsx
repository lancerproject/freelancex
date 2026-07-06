import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChatThread } from "@/components/chat-thread";
import { ChatHeaderMenu } from "@/components/chat-header-menu";
import {
  ChatSidePanel,
  type PanelFile,
  type PanelLink,
  type PanelSearchMessage,
  type PanelTimeline,
} from "@/components/chat-side-panel";
import { InboxList } from "@/components/inbox-list";
import { InboxNotifier } from "@/components/inbox-notifier";
import { DesktopAlertsBar } from "@/components/desktop-alerts-bar";
import { ChatRulesModal } from "@/components/chat-rules-modal";
import { IdentityBannerContent } from "@/components/identity-banner";
import { identityBlocked } from "@/lib/identity";
import { LocalTime } from "@/components/local-time";
import { getInbox } from "@/lib/inbox";
import { getClientInfo } from "@/app/(dashboard)/jobs/client-actions";

const URL_RE = /(https?:\/\/[^\s]+)/g;

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, jobs ( id, title, client_id )")
    .eq("id", id)
    .single();
  if (!conversation) notFound();
  if (
    conversation.participant_1 !== user.id &&
    conversation.participant_2 !== user.id
  ) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(conversation.jobs)
    ? conversation.jobs[0]
    : conversation.jobs;

  // Left rail data (shared with /messages).
  const { items, saved } = await getInbox(supabase, user.id);
  const thisItem = items.find((i) => i.id === id);

  const otherUserId =
    conversation.participant_1 === user.id
      ? conversation.participant_2
      : conversation.participant_1;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherUserId)
    .single();
  const otherOnline = !!otherProfile?.online_for_messages;
  const otherAway = !!otherProfile?.out_of_office;

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, sender_id, content, created_at, read, attachment_url, attachment_name, kind, offer_id, request_id"
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  const msgs = messages ?? [];

  // Offer details for any offer cards in this thread.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offersById: Record<string, any> = {};
  const offerIds = Array.from(
    new Set(msgs.map((m) => m.offer_id).filter(Boolean))
  ) as string[];
  if (offerIds.length > 0) {
    const { data: offerRows } = await supabase
      .from("contracts")
      .select(
        "id, title, amount, rate_type, end_date, offer_expires_at, freelancer_id, client_message, offer_milestones, client:profiles!client_id ( full_name )"
      )
      .in("id", offerIds);
    for (const o of offerRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = Array.isArray(o.client) ? o.client[0] : o.client;
      const milestones = Array.isArray(o.offer_milestones)
        ? o.offer_milestones
        : [];
      const funds =
        milestones.length > 0
          ? milestones.reduce(
              (s: number, m: { amount?: number }) => s + (Number(m.amount) || 0),
              0
            )
          : Number(o.amount) || 0;
      offersById[o.id] = {
        id: o.id,
        title: o.title || "Job offer",
        amount: Number(o.amount) || 0,
        rateType: o.rate_type === "hourly" ? "hourly" : "fixed",
        deadline: o.end_date ?? null,
        expiresAt: o.offer_expires_at ?? null,
        clientName: client?.full_name || "Client",
        description: o.client_message ?? null,
        firstMilestoneName: milestones[0]?.name ?? null,
        projectFunds: funds,
        viewerIsFreelancer: o.freelancer_id === user.id,
      };
    }
  }

  // Contract proposals (freelancer → client cards).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestsById: Record<string, any> = {};
  const requestIds = Array.from(
    new Set(msgs.map((m) => m.request_id).filter(Boolean))
  ) as string[];
  if (requestIds.length > 0) {
    const { data: requestRows } = await supabase
      .from("contract_requests")
      .select(
        "id, title, amount, rate_type, duration, client_id, freelancer:profiles!freelancer_id ( full_name )"
      )
      .in("id", requestIds);
    for (const r of requestRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const freelancer: any = Array.isArray(r.freelancer)
        ? r.freelancer[0]
        : r.freelancer;
      requestsById[r.id] = {
        id: r.id,
        title: r.title || "Contract proposal",
        amount: Number(r.amount) || 0,
        rateType: r.rate_type === "hourly" ? "hourly" : "fixed",
        duration: r.duration ?? null,
        freelancerName: freelancer?.full_name || "Freelancer",
        viewerIsClient: r.client_id === user.id,
      };
    }
  }

  // Messages this viewer has saved (☆).
  const { data: savedRows } = await supabase
    .from("saved_messages")
    .select("message_id")
    .eq("user_id", user.id)
    .eq("conversation_id", id);
  const savedIds = (savedRows ?? []).map((r) => r.message_id as string);

  // Mark the other person's messages in this conversation as read.
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .eq("read", false);

  // My profile — core columns first (never breaks pre-migration), then flags.
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("full_name, email, suspended, role")
    .eq("id", user.id)
    .maybeSingle();
  let rulesAccepted = true;
  let outOfOffice = false;
  let oooUntil: string | null = null;
  let meOnline = false;
  let msgInapp = true;
  let msgEmail = true;
  {
    const { data } = await supabase
      .from("profiles")
      .select(
        "chat_rules_accepted_at, out_of_office, out_of_office_until, online_for_messages, notification_prefs"
      )
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      rulesAccepted = !!data.chat_rules_accepted_at;
      outOfOffice = !!data.out_of_office;
      oooUntil = data.out_of_office_until ?? null;
      meOnline = !!data.online_for_messages;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgPrefs: any = data.notification_prefs?.messages;
      msgInapp = msgPrefs?.inapp !== false;
      msgEmail = msgPrefs?.email !== false;
    }
  }
  const myName = myProfile?.full_name || myProfile?.email || "You";
  const otherName = otherProfile?.full_name || "User";
  const viewerIsFreelancer = myProfile?.role === "freelancer";
  const showRules = viewerIsFreelancer && !rulesAccepted;
  const idRequired = viewerIsFreelancer ? await identityBlocked() : false;

  // ---- Right panel data ------------------------------------------------------
  // Timeline (job conversations): proposal → offer → acceptance → start.
  let timeline: PanelTimeline | null = null;
  let proposalId: string | null = null;
  if (job?.id) {
    const freelancerId = viewerIsFreelancer ? user.id : otherUserId;
    const [{ data: prop }, { data: offerRows }] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, created_at")
        .eq("job_id", job.id)
        .eq("freelancer_id", freelancerId)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("contracts")
        .select("id, created_at, status, responded_at, start_date")
        .eq("job_id", job.id)
        .eq("freelancer_id", freelancerId)
        .order("created_at", { ascending: true }),
    ]);
    proposalId = prop?.id ?? null;
    const offers = offerRows ?? [];
    const firstOffer = offers[0];
    const accepted = offers.find(
      (o) =>
        o.responded_at && (o.status === "active" || o.status === "completed")
    );
    const pending = offers.find((o) => o.status === "offer");
    timeline = {
      proposalAt: prop?.created_at ?? null,
      offerAt: firstOffer?.created_at ?? null,
      offerAcceptedAt: accepted?.responded_at ?? null,
      contractStartsAt: accepted?.start_date ?? null,
      pendingOfferId: pending?.id ?? null,
    };
  }

  // The viewer's private note for this conversation (personal notepad).
  const { data: myPref } = await supabase
    .from("conversation_prefs")
    .select("note")
    .eq("user_id", user.id)
    .eq("conversation_id", id)
    .maybeSingle();
  const myNote = myPref?.note ?? null;

  // "View details" under the proposal-intro chat message — same destination
  // as "View proposal" for the freelancer; the client goes to their proposal
  // review tab for this job.
  const proposalDetailsHref = job?.id
    ? viewerIsFreelancer && proposalId
      ? `/proposals/${proposalId}`
      : !viewerIsFreelancer
        ? `/jobs/${job.id}?tab=proposals&sub=all`
        : null
    : null;

  // Client facts (freelancer viewing a client).
  let clientFacts = null;
  if (viewerIsFreelancer && otherProfile?.role === "client") {
    const info = await getClientInfo(otherUserId).catch(() => null);
    if (info) {
      clientFacts = {
        country: info.country,
        memberSince: info.createdAt
          ? new Date(info.createdAt).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })
          : null,
        paymentVerified: info.paymentVerified,
        spent: info.totalSpent,
        jobsPosted: info.jobsPosted,
        hireRate: info.hireRate,
        openJobs: info.openJobs,
      };
    }
  }

  // Files + links shared in this chat (newest first).
  const files: PanelFile[] = [];
  const links: PanelLink[] = [];
  const searchable: PanelSearchMessage[] = [];
  for (const m of msgs) {
    if (m.attachment_url) {
      files.push({
        id: m.id,
        name: m.attachment_name || "Attachment",
        url: m.attachment_url,
        at: m.created_at,
      });
    } else if (
      m.content &&
      (!m.kind || m.kind === "text")
    ) {
      searchable.push({
        id: m.id,
        content: m.content,
        at: m.created_at,
        fromMe: m.sender_id === user.id,
      });
      const found = m.content.match(URL_RE);
      for (const url of found ?? []) links.push({ url, at: m.created_at });
    }
  }
  files.reverse();
  links.reverse();

  const namesByConversation: Record<string, string> = {};
  for (const i of items) namesByConversation[i.id] = i.otherName;

  const ended = !!conversation.ended_at;
  const endedByMe = conversation.ended_by === user.id;
  const isDirect = !conversation.job_id && !conversation.contract_id;

  // ---- Chat blocks ------------------------------------------------------------
  // Blocking is HIDDEN while the two share an active contract; my own block is
  // readable via RLS, theirs only via the service role (kept private).
  let canBlock = true;
  let blockedByMe = false;
  let blockedMe = false;
  {
    const { data: working } = await supabase
      .from("contracts")
      .select("id")
      .or(
        `and(client_id.eq.${user.id},freelancer_id.eq.${otherUserId}),and(client_id.eq.${otherUserId},freelancer_id.eq.${user.id})`
      )
      .in("status", ["active", "disputed"])
      .limit(1)
      .maybeSingle();
    canBlock = !working;

    const { data: mine } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUserId)
      .limit(1)
      .maybeSingle();
    blockedByMe = !!mine;

    try {
      const { createAdminClient } = await import("@/lib/supabase-admin");
      const { data: theirs } = await createAdminClient()
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", otherUserId)
        .eq("blocked_id", user.id)
        .limit(1)
        .maybeSingle();
      blockedMe = !!theirs;
    } catch {
      /* pre-migration */
    }
  }

  return (
    // Fills the viewport under the sticky 62px navbar (shown on all app pages).
    <div className="h-[calc(100vh-62px)] flex flex-col overflow-hidden bg-background">
      <DesktopAlertsBar />
      {idRequired && (
        <div className="px-4 pt-3 shrink-0">
          <IdentityBannerContent />
        </div>
      )}
      {showRules && <ChatRulesModal />}
      <InboxNotifier
        userId={user.id}
        conversationIds={items.map((i) => i.id)}
        activeConversationId={id}
        namesByConversation={namesByConversation}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left rail */}
        <div className="hidden md:block w-80 border-r border-border bg-card shrink-0 h-full">
          <InboxList
            items={items}
            saved={saved}
            activeId={id}
            meOutOfOffice={outOfOffice}
            meOooUntil={oooUntil}
            meOnline={meOnline}
            msgInapp={msgInapp}
            msgEmail={msgEmail}
          />
        </div>

        {/* Middle — chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-card border-b border-border px-6 py-3.5 shrink-0">
            <Link
              href="/messages"
              className="md:hidden inline-block text-sm text-primary hover:underline mb-1"
            >
              ← All messages
            </Link>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-lg text-foreground truncate">
                    {otherName}
                  </h2>
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      otherAway
                        ? "bg-amber-400"
                        : otherOnline
                          ? "bg-green-500"
                          : "bg-neutral-300"
                    }`}
                    title={
                      otherAway ? "Away" : otherOnline ? "Online" : "Offline"
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {otherAway ? "Away" : otherOnline ? "Online" : "Offline"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · 🕐 <LocalTime timezone={otherProfile?.timezone ?? undefined} />{" "}
                    local time
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {job?.title ||
                    thisItem?.contractTitle ||
                    "Direct message"}
                </p>
              </div>
              <ChatHeaderMenu
                conversationId={id}
                otherId={otherUserId}
                otherName={otherName}
                isDirect={isDirect}
                favorite={thisItem?.favorite ?? false}
                hidden={thisItem?.hidden ?? false}
                ended={ended}
                endedByMe={endedByMe}
                canBlock={canBlock}
                blockedByMe={blockedByMe}
              />
            </div>
          </div>

          <ChatThread
            conversationId={id}
            userId={user.id}
            myName={myName}
            otherName={otherName}
            initial={msgs}
            suspended={myProfile?.suspended ?? false}
            offersById={offersById}
            requestsById={requestsById}
            savedIds={savedIds}
            endedAt={conversation.ended_at ?? null}
            endedByMe={endedByMe}
            blockedByMe={blockedByMe}
            blockedMe={blockedMe}
            proposalDetailsHref={proposalDetailsHref}
          />
        </div>

        {/* Right — detail panel */}
        <div className="hidden lg:block w-80 border-l border-border bg-background shrink-0 overflow-y-auto">
          <ChatSidePanel
            conversationId={id}
            other={{
              id: otherUserId,
              name: otherName,
              avatar: otherProfile?.avatar_url ?? null,
              online: otherOnline,
              away: otherAway,
              timezone: otherProfile?.timezone ?? null,
              bio: otherProfile?.bio ?? null,
            }}
            viewerIsFreelancer={viewerIsFreelancer}
            proposalId={proposalId}
            jobId={job?.id ?? null}
            jobTitle={job?.title ?? thisItem?.contractTitle ?? null}
            contractId={conversation.contract_id ?? null}
            timeline={timeline}
            clientFacts={clientFacts}
            files={files}
            links={links}
            searchable={searchable}
            ended={ended}
            myNote={myNote}
          />
        </div>
      </div>
    </div>
  );
}
