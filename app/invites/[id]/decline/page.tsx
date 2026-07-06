import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { InviteDeclineForm } from "@/components/invite-decline-form";

export const metadata = { title: "Decline invite | Xwork" };

// Warm, friendly decline page — reason + future-invite preference.
export default async function DeclineInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invite } = await supabase
    .from("invites")
    .select(
      "id, status, freelancer_id, jobs ( title ), client:profiles!client_id ( full_name )"
    )
    .eq("id", id)
    .maybeSingle();
  if (!invite || invite.freelancer_id !== user.id) notFound();
  if (invite.status !== "pending") redirect(`/invites/${id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(invite.jobs) ? invite.jobs[0] : invite.jobs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = Array.isArray(invite.client)
    ? invite.client[0]
    : invite.client;
  const clientName = client?.full_name || "this client";

  return (
    <main className="min-h-screen px-4 py-10 w-full">
      <div className="max-w-xl mx-auto">
        <div className="text-center">
          {/* Friendly wave — light and simple, not an error icon */}
          <svg
            viewBox="0 0 96 96"
            className="w-20 h-20 mx-auto"
            aria-hidden
            fill="none"
          >
            <circle cx="48" cy="48" r="44" className="fill-primary/10" />
            <text
              x="48"
              y="60"
              textAnchor="middle"
              fontSize="40"
            >
              👋
            </text>
          </svg>
          <h1 className="text-2xl font-bold text-foreground mt-4">
            No worries — let us know why
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your feedback helps clients send better invites in the future.
          </p>
          {job?.title && (
            <p className="text-sm text-foreground mt-3">
              Declining: <span className="font-medium">{job.title}</span>
            </p>
          )}
        </div>

        {sp.error === "reason" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            Please select a reason for declining.
          </div>
        )}
        {sp.error === "custom" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
            Please tell us a bit more (at least 10 characters).
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 mt-6">
          <InviteDeclineForm inviteId={invite.id} clientName={clientName} />
        </div>
      </div>
    </main>
  );
}
