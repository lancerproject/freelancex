import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { acceptInvite } from "../actions";
import { getClientInfo } from "@/app/(dashboard)/jobs/client-actions";

export const metadata = { title: "Job invite | Xwork" };

// Invite detail — a full job view with equal-weight Accept / Decline actions.
export default async function InviteDetailPage({
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

  const { data: invite } = await supabase
    .from("invites")
    .select(
      "*, jobs ( id, title, description, budget, job_type, skills, experience_level, duration, created_at, status ), client:profiles!client_id ( id, full_name, payment_verified )"
    )
    .eq("id", id)
    .maybeSingle();
  if (!invite || invite.freelancer_id !== user.id) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(invite.jobs) ? invite.jobs[0] : invite.jobs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = Array.isArray(invite.client)
    ? invite.client[0]
    : invite.client;
  const info = client?.id ? await getClientInfo(client.id) : null;

  const skills = String(job?.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

  const statusPill =
    invite.status === "accepted" ? (
      <span className="bg-primary/15 text-primary text-xs rounded-full px-3 py-1 font-semibold">
        Accepted
      </span>
    ) : invite.status === "declined" ? (
      <span className="bg-red-100 text-red-600 text-xs rounded-full px-3 py-1 font-semibold">
        Declined
      </span>
    ) : (
      <span className="bg-blue-500/10 text-blue-600 text-xs rounded-full px-3 py-1 font-semibold">
        Pending
      </span>
    );

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1100px] mx-auto">
        <Link
          href="/freelancer?tab=invites"
          className="text-sm text-primary hover:underline"
        >
          ← Back to invites
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 mt-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">
                💼 {client?.full_name || "A client"}
                {client?.payment_verified ? " ✓" : ""} invited you to apply
                {invite.sent_at ? ` · ${fmt(invite.sent_at)}` : ""}
              </p>
              <h1 className="text-3xl font-bold text-foreground mt-1">
                {job?.title || "Job"}
              </h1>
            </div>
            {statusPill}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <Fact label="Budget" value={job?.budget ? `$${job.budget}` : "—"} />
            <Fact
              label="Job type"
              value={job?.job_type === "hourly" ? "Hourly" : "Fixed-price"}
            />
            <Fact
              label="Experience"
              value={job?.experience_level || "Intermediate"}
            />
            <Fact label="Posted" value={fmt(job?.created_at) || "—"} />
          </div>

          {job?.description && (
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="font-semibold text-foreground mb-2">
                About the job
              </h2>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </div>
          )}

          {skills.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold text-foreground mb-2">
                Skills and expertise
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((s: string) => (
                  <span
                    key={s}
                    className="bg-secondary text-foreground text-sm rounded-full px-3 py-1"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* About the client */}
          {info && (
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="font-semibold text-foreground mb-3">
                About the client
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Fact
                  label="Payment"
                  value={info.paymentVerified ? "✓ Verified" : "Not verified"}
                />
                <Fact
                  label="Total spent"
                  value={info.totalSpent > 0 ? `$${info.totalSpent}` : "New client"}
                />
                <Fact
                  label="Jobs posted"
                  value={String(info.jobsPosted ?? 0)}
                />
                <Fact label="Hire rate" value={`${info.hireRate ?? 0}%`} />
              </div>
            </div>
          )}

          {/* Actions — two equal buttons while pending */}
          {invite.status === "pending" &&
          (!job?.status || job.status === "open") ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <form action={acceptInvite.bind(null, invite.id)}>
                <button className="w-full bg-primary text-primary-foreground rounded-full px-6 py-3 font-semibold hover:opacity-90">
                  ✅ Accept &amp; Submit Proposal
                </button>
              </form>
              <Link
                href={`/invites/${invite.id}/decline`}
                className="w-full block text-center border border-red-300 text-red-600 rounded-full px-6 py-3 font-semibold hover:bg-red-50"
              >
                ❌ Decline Invite
              </Link>
            </div>
          ) : invite.status === "accepted" ? (
            <div className="mt-8 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
              ✅ You accepted this invite
              {invite.accepted_at ? ` on ${fmt(invite.accepted_at)}` : ""}.{" "}
              <Link href="/freelancer" className="text-primary underline">
                View your proposals
              </Link>
            </div>
          ) : invite.status === "declined" ? (
            <div className="mt-8 rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
              You declined this invite
              {invite.declined_at ? ` on ${fmt(invite.declined_at)}` : ""}.
              {job?.id && (!job?.status || job.status === "open") && (
                <>
                  {" "}
                  Changed your mind? You can still{" "}
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-primary underline"
                  >
                    apply to this job
                  </Link>{" "}
                  manually.
                </>
              )}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
              This job is no longer accepting proposals.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 capitalize">
        {value}
      </p>
    </div>
  );
}
