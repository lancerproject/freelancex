import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { SendOfferForm } from "@/components/send-offer-form";
import { LocalTime } from "@/components/local-time";

export const metadata = { title: "Propose a contract | Xwork" };

// Freelancer's "Propose a contract" page — the same form the client uses to
// send an offer, but single-step (no checkout) and it sends a contract
// proposal to the client, who can review, edit and turn it into an offer.
export default async function ProposeContractPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, job_id, ended_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo) notFound();
  if (convo.participant_1 !== user.id && convo.participant_2 !== user.id) {
    redirect("/messages");
  }
  if (convo.ended_at) redirect(`/messages/${conversationId}`);

  // Only a freelancer proposes; the other participant is the client.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "freelancer") redirect(`/messages/${conversationId}`);

  const clientId =
    convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
  const { data: client } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, location, country, city, timezone")
    .eq("id", clientId)
    .maybeSingle();
  const clientName = client?.full_name || "the client";
  const clientLoc =
    client?.location ||
    [client?.city, client?.country].filter(Boolean).join(", ");

  let jobTitle: string | undefined;
  if (convo.job_id) {
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", convo.job_id)
      .maybeSingle();
    jobTitle = jobRow?.title ?? undefined;
  }

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full max-w-6xl mx-auto">
      <Link
        href={`/messages/${conversationId}`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to messages
      </Link>
      <h1 className="text-3xl font-bold text-foreground mt-3 mb-1">
        Propose a contract
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Suggest terms to {clientName}. If they accept, they&apos;ll send you a
        formal offer to review — your payment stays protected on Xwork.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div>
          <SendOfferForm
            mode="propose"
            conversationId={conversationId}
            freelancerId={user.id}
            freelancerName={clientName}
            jobId={convo.job_id ?? undefined}
            jobTitle={jobTitle}
            defaultTitle={jobTitle}
          />
        </div>

        {/* Client summary (right sidebar) */}
        <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            {client?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={client.avatar_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {clientName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {clientName}
              </p>
              <p className="text-xs text-muted-foreground">Client</p>
            </div>
          </div>
          {clientLoc && (
            <p className="text-sm text-foreground mt-3">
              {clientLoc}
              <span className="text-muted-foreground">
                {" · "}
                <LocalTime timezone={client?.timezone ?? undefined} /> local time
              </span>
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
