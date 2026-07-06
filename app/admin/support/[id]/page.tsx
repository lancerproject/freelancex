import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect, notFound } from "next/navigation";
import { adminReplyTicket, adminSetTicketStatus } from "../../support-actions";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { AttachmentList } from "@/components/attachment-list";

export const metadata = { title: "Ticket | Xwork Admin" };

export default async function AdminTicketPage({
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
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, user_id, subject, category, status, contract_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) notFound();

  const [{ data: requester }, { data: msgRows }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", ticket.user_id)
      .maybeSingle(),
    admin
      .from("support_messages")
      .select("id, sender_id, is_staff, body, attachments, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);
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
        <Link
          href="/admin/support"
          className="text-sm text-primary hover:underline"
        >
          ← Support &amp; disputes
        </Link>

        <div className="flex items-start justify-between gap-4 mt-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {ticket.category === "dispute" ? "⚖️ " : ""}
              {ticket.subject}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {requester?.full_name || requester?.email || "User"} ·{" "}
              {ticket.category} · opened{" "}
              {new Date(ticket.created_at).toLocaleDateString()}
              {ticket.contract_id ? (
                <>
                  {" · "}
                  <Link
                    href={`/contracts/${ticket.contract_id}`}
                    className="text-primary hover:underline"
                  >
                    View contract
                  </Link>
                </>
              ) : null}
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
                {m.is_staff ? "Xwork Support (you)" : "User"} ·{" "}
                {fmt(m.created_at)}
              </p>
              {m.body && (
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                  {m.body}
                </p>
              )}
              <AttachmentList items={m.attachments} />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <form action={adminReplyTicket.bind(null, ticket.id)}>
            <textarea
              name="body"
              rows={4}
              placeholder="Reply to the user…"
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3">
              <AttachmentUploader userId={user.id} />
            </div>
            <button
              type="submit"
              className="mt-3 bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold hover:opacity-90"
            >
              Send reply
            </button>
          </form>
          <form
            action={adminSetTicketStatus.bind(
              null,
              ticket.id,
              ticket.status === "open" ? "closed" : "open"
            )}
            className="mt-3"
          >
            <button className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {ticket.status === "open"
                ? "Close this ticket"
                : "Reopen this ticket"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
