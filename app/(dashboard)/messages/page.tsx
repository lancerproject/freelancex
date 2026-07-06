import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInbox } from "@/lib/inbox";
import { InboxList } from "@/components/inbox-list";
import { InboxNotifier } from "@/components/inbox-notifier";
import { DesktopAlertsBar } from "@/components/desktop-alerts-bar";
import { ChatRulesModal } from "@/components/chat-rules-modal";
import { IdentityBannerContent } from "@/components/identity-banner";
import { identityBlocked } from "@/lib/identity";

export const metadata = { title: "Messages | Xwork" };

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { items, saved } = await getInbox(supabase, user.id);

  // Core profile flags — split selects so a pending migration can never break
  // the page (a Supabase select fails wholesale if one column is missing).
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
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

  const showRules =
    me?.role === "freelancer" && !rulesAccepted && items.length > 0;

  // Identity line shows here too — embedded inside the height-locked
  // workspace so the chat input never gets pushed below the fold.
  const idRequired =
    me?.role === "freelancer" ? await identityBlocked() : false;

  const namesByConversation: Record<string, string> = {};
  for (const i of items) namesByConversation[i.id] = i.otherName;

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
        namesByConversation={namesByConversation}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left rail */}
        <div className="w-80 border-r border-border bg-card shrink-0 h-full">
          <InboxList
            items={items}
            saved={saved}
            meOutOfOffice={outOfOffice}
            meOooUntil={oooUntil}
            meOnline={meOnline}
            msgInapp={msgInapp}
            msgEmail={msgEmail}
          />
        </div>

        {/* Main area — empty state */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to Messages
            </h2>
            <p className="text-muted-foreground text-sm">
              {items.length > 0
                ? "Select a conversation to start chatting."
                : "Once you connect with a client or freelancer, you'll be able to chat and collaborate here."}
            </p>
            {items.length === 0 && (
              <Link
                href="/dashboard"
                className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition"
              >
                Find work
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
