import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { addSupportMessage, setTicketStatus } from "../actions";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { AttachmentList } from "@/components/attachment-list";

export const metadata = { title: "Support request | Xwork" };

export default async function SupportTicketPage({
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

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, subject, category, status, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ticket) notFound();

  const { data: msgRows } = await supabase
    .from("support_messages")
    .select("id, sender_id, is_staff, body, attachments, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });
  const messages = msgRows ?? [];

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
      <div className="max-w-[760px] mx-auto">
        <Link href="/support" className="text-sm text-primary hover:underline">
          ← All support requests
        </Link>

        <div className="flex items-start justify-between gap-4 mt-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {ticket.subject}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Opened{" "}
              {new Date(ticket.created_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`text-xs rounded-full px-2.5 py-1 font-medium ${
              ticket.status === "open"
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {ticket.status === "open" ? "Open" : "Closed"}
          </span>
        </div>

        {/* Thread */}
        <div className="mt-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border p-4 ${
                m.is_staff
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {m.is_staff ? "Xwork Support" : "You"} · {fmt(m.created_at)}
              </p>
              {m.body && (
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                  {m.body}
                </p>
              )}
              <AttachmentList items={m.attachments} />
            </div>
          ))}
          {messages.every((m) => !m.is_staff) && (
            <p className="text-xs text-muted-foreground">
              Our team typically replies within 1 business day. Replies will
              appear here and in your notifications.
            </p>
          )}
        </div>

        {/* Reply + status */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <form action={addSupportMessage.bind(null, ticket.id)}>
            <textarea
              name="body"
              rows={4}
              placeholder={
                ticket.status === "open"
                  ? "Add more details…"
                  : "Add a message to reopen this request…"
              }
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3">
              <AttachmentUploader userId={user.id} />
            </div>
            <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
              <button
                type="submit"
                className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold hover:opacity-90"
              >
                Send
              </button>
            </div>
          </form>
          <form
            action={setTicketStatus.bind(
              null,
              ticket.id,
              ticket.status === "open" ? "closed" : "open"
            )}
            className="mt-3"
          >
            <button className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {ticket.status === "open"
                ? "Mark as resolved / close this request"
                : "Reopen this request"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
