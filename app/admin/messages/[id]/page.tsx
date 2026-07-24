import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase-admin";

export const metadata = { title: "Conversation | Xwork Admin" };

// Read-only admin view of a single conversation's full message history.
export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: convo } = await admin
    .from("conversations")
    .select(
      "id, participant_1, participant_2, job_id, contract_id, created_at, ended_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!convo) notFound();

  const { data: msgs } = await admin
    .from("messages")
    .select("id, sender_id, content, attachment_url, attachment_name, kind, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  const messages = msgs ?? [];

  const { data: people } = await admin
    .from("profiles")
    .select("id, full_name, username, email, role")
    .in("id", [convo.participant_1, convo.participant_2].filter(Boolean));
  const nameById: Record<string, string> = {};
  for (const p of people ?? [])
    nameById[p.id] = p.full_name || p.username || p.email || "User";

  let jobTitle = "";
  if (convo.job_id) {
    const { data: job } = await admin
      .from("jobs")
      .select("title")
      .eq("id", convo.job_id)
      .maybeSingle();
    jobTitle = job?.title || "";
  }

  const name = (uid: string | null) => (uid && nameById[uid]) || "User";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[820px] mx-auto">
        <Link
          href="/admin/messages"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← All chat rooms
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-3">
          {name(convo.participant_1)} ↔ {name(convo.participant_2)}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mb-2">
          {jobTitle ? `Job: ${jobTitle} · ` : ""}
          {messages.length} message{messages.length === 1 ? "" : "s"}
          {convo.ended_at ? " · ended" : ""}
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Read-only admin oversight — messages are shown exactly as the two
          parties see them.
        </p>

        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">No messages in this conversation.</p>
          ) : (
            messages.map((m) => {
              const isSystem = m.kind === "system";
              if (isSystem) {
                return (
                  <p
                    key={m.id}
                    className="text-center text-xs text-muted-foreground py-1"
                  >
                    {m.content}
                  </p>
                );
              }
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {name(m.sender_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmt(m.created_at)}
                    </span>
                  </div>
                  {m.content && (
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                  )}
                  {m.attachment_url && (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                    >
                      📎 {m.attachment_name || "Attachment"}
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
