import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { getClientInfo } from "@/app/(dashboard)/jobs/client-actions";
import { OfferActions } from "@/components/offer-actions";
import { openOfferChat } from "@/app/offers/actions";
import { offerStatusOf } from "@/lib/proposal-hub";

export const metadata = { title: "Job offer | Xwork" };

// THE offer hub — every entry point (chat card, notification, home page,
// Offers tab) opens this exact page. Left: full offer details + actions.
// Right: the client sidebar, always visible, loaded automatically.
export default async function OfferDetailPage({
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

  const { data: offer } = await supabase
    .from("contracts")
    .select(
      "*, jobs ( id, title, category ), client:profiles!client_id ( id, full_name, avatar_url, country, payment_verified, id_verified )"
    )
    .eq("id", id)
    .maybeSingle();
  // Only the recipient freelancer views this page.
  if (!offer || offer.freelancer_id !== user.id) notFound();

  // The viewer's plan sets their marketplace fee (Pro 5% / Basic 10%) for the
  // payment breakdown table.
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const { getMembership } = await import("@/lib/membership");
  const { feePercent, feeFromGross, netFromGross } = await import("@/lib/fees");
  const viewerPlan = getMembership(viewerProfile).plan;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = Array.isArray(offer.client) ? offer.client[0] : offer.client;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any = Array.isArray(offer.jobs) ? offer.jobs[0] : offer.jobs;
  const info = client?.id ? await getClientInfo(client.id) : null;

  // Mark this offer's notifications read (best-effort).
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("link", `/freelancer/offers/${id}`)
    .eq("is_read", false);

  const status = offerStatusOf(offer); // pending | accepted | declined | expired
  const milestones: { name: string; amount: number; due_date?: string | null }[] =
    Array.isArray(offer.offer_milestones) ? offer.offer_milestones : [];

  const fmtDate = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;
  const fmtDateTime = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  const PILL: Record<string, { label: string; cls: string }> = {
    pending: { label: "⏳ Pending", cls: "bg-yellow-500/15 text-yellow-600" },
    accepted: { label: "✅ Accepted", cls: "bg-primary/15 text-primary" },
    declined: { label: "❌ Declined", cls: "bg-red-100 text-red-600" },
    expired: { label: "⏰ Offer Expired", cls: "bg-secondary text-muted-foreground" },
  };
  const pill = PILL[status];

  const money = (n: number) =>
    Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[1200px] mx-auto">
        <Link
          href="/freelancer?tab=offers"
          className="text-sm text-primary hover:underline"
        >
          ← Back to offers
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 mt-4 items-start">
          {/* ---------------- LEFT — offer details ---------------- */}
          <div>
          {status === "pending" && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-4">
              <h2 className="font-bold text-foreground">
                🎉 Congrats on your offer!
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>
                  ✓ {client?.full_name || "This client"}
                  {info?.createdAt
                    ? ` has been on Xwork since ${new Date(info.createdAt).getFullYear()}`
                    : ""}
                  {info
                    ? ` with ${info.openJobs} open job${info.openJobs === 1 ? "" : "s"} and a ${info.hireRate}% hire rate`
                    : ""}
                  .
                </li>
                <li>
                  ✓ Review the project details and payment section to make sure
                  timelines and expectations are clear.
                </li>
                <li>
                  ✓ If you&apos;d like any updates to the offer, chat with{" "}
                  {client?.full_name || "the client"} before accepting.
                </li>
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Offer from {client?.full_name || "Client"}
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                  {offer.title || job?.title || "Job offer"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`inline-block text-sm rounded-full px-3 py-1.5 font-semibold ${pill.cls}`}
                >
                  {pill.label}
                </span>
                {status === "pending" && offer.offer_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Respond by {fmtDate(offer.offer_expires_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Offered by">
                <Link
                  href={`/profile/${client?.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {client?.full_name || "Client"}
                </Link>
                {client?.payment_verified && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">
                    ✓ Verified
                  </span>
                )}
              </Field>

              <Field label="Payment">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-1">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="font-medium pb-2 pr-4">Payment option</th>
                        <th className="font-medium pb-2 pr-4">
                          Amount (what the client will see)
                        </th>
                        <th className="font-medium pb-2 pr-4">
                          Marketplace fee: {feePercent(viewerPlan)}%
                        </th>
                        <th className="font-medium pb-2">
                          Expected amount you&apos;ll receive
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="py-2.5 pr-4 text-foreground font-medium">
                          {offer.rate_type === "hourly"
                            ? "Hourly"
                            : "Fixed price"}
                        </td>
                        <td className="py-2.5 pr-4 text-foreground">
                          {money(offer.amount)}
                          {offer.rate_type === "hourly" ? "/hr" : ""}
                        </td>
                        <td className="py-2.5 pr-4 text-red-600">
                          −{money(feeFromGross(Number(offer.amount) || 0, viewerPlan))}
                        </td>
                        <td className="py-2.5 text-foreground font-bold">
                          {money(netFromGross(Number(offer.amount) || 0, viewerPlan))}
                          {offer.rate_type === "hourly" ? "/hr" : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {viewerPlan === "basic" && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Pro members pay only a 5% marketplace fee.{" "}
                    <Link
                      href="/settings/membership"
                      className="text-primary hover:underline"
                    >
                      Upgrade
                    </Link>
                  </p>
                )}
              </Field>

              {milestones.length > 0 && (
                <Field label={milestones.length === 1 ? "Milestone" : "Milestones"}>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-foreground">
                    {milestones.map((m, i) => (
                      <li key={i}>
                        <span className="font-medium">{m.name}</span> —{" "}
                        {money(Number(m.amount) || 0)}
                        {m.due_date ? ` — Due: ${fmtDate(m.due_date)}` : ""}
                      </li>
                    ))}
                  </ol>
                </Field>
              )}

              {offer.client_message && (
                <Field label="About this Offer">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {offer.client_message}
                  </p>
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Status">
                  {status === "pending"
                    ? "Waiting for you to accept this offer"
                    : pill.label.replace(/^[^\s]+\s/, "")}
                </Field>
                {job?.category && (
                  <Field label="Job Category">{job.category}</Field>
                )}
                <Field label="Project Deadline">
                  {fmtDate(offer.end_date) || "No deadline specified"}
                </Field>
                {offer.contract_duration && (
                  <Field label="Contract Duration">
                    {offer.contract_duration}
                  </Field>
                )}
                <Field label="Offer Sent">
                  {fmtDateTime(offer.created_at) || "—"}
                </Field>
                {offer.offer_expires_at && (
                  <Field label="Offer Expires">
                    {status === "expired" ? (
                      <span className="text-red-600 font-semibold">
                        {fmtDateTime(offer.offer_expires_at)} — Offer Expired
                      </span>
                    ) : (
                      fmtDateTime(offer.offer_expires_at)
                    )}
                  </Field>
                )}
              </div>

              {/* FAQ */}
              <details className="rounded-xl border border-border bg-secondary/30 group">
                <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-foreground">
                  Frequently asked questions
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                    ⌄
                  </span>
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">
                    How do fixed-price contracts work?
                  </p>
                  <p>
                    Your client funds each milestone into escrow before you
                    start it. When you submit the milestone&apos;s work, the
                    client reviews it and releases payment to your Xwork
                    balance (minus the marketplace fee shown above). If a
                    contract ends with funds remaining, they&apos;re handled
                    through our refund and dispute process.
                  </p>
                  <p className="font-semibold text-foreground">
                    Can I ask for different terms?
                  </p>
                  <p>
                    Yes — chat with the client before accepting; they can send
                    an updated offer. Accepting starts the contract on the
                    terms shown here.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-border mt-6 pt-6">
              {status === "pending" ? (
                <OfferActions
                  offerId={offer.id}
                  title={offer.title || job?.title || "Job offer"}
                  amount={Number(offer.amount) || 0}
                  rateType={offer.rate_type === "hourly" ? "hourly" : "fixed"}
                  clientName={client?.full_name || "Client"}
                  deadline={offer.end_date ?? null}
                  withTerms
                />
              ) : status === "accepted" ? (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm font-medium text-foreground">
                    ✅ You accepted this offer
                    {offer.responded_at
                      ? ` on ${fmtDateTime(offer.responded_at)}`
                      : ""}
                    .
                  </p>
                  <Link
                    href={`/contracts/${offer.id}`}
                    className="inline-block mt-3 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
                  >
                    🎉 Contract Started! View Contract →
                  </Link>
                </div>
              ) : status === "declined" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    ❌ You declined this offer
                    {offer.responded_at
                      ? ` on ${fmtDateTime(offer.responded_at)}`
                      : ""}
                    .
                  </p>
                  <Link
                    href="/jobs"
                    className="inline-block mt-3 border border-border bg-card text-foreground rounded-full px-5 py-2 text-sm font-semibold hover:bg-secondary"
                  >
                    Browse Matching Jobs →
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">
                    ⏰ This offer has expired.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* ---------------- RIGHT — client sidebar (sticky) ---------------- */}
          <aside className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-semibold text-foreground mb-4">
              About the Client
            </h2>
            <div className="flex items-center gap-3">
              {client?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={client.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold text-foreground">
                  {(client?.full_name || "C").slice(0, 1)}
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">
                  {client?.full_name || "Client"}
                  {client?.payment_verified && (
                    <span className="ml-1.5 text-primary" title="Verified">
                      ✓
                    </span>
                  )}
                </p>
                {client?.country && (
                  <p className="text-sm text-muted-foreground">
                    📍 {client.country}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              {info?.createdAt && (
                <p className="text-muted-foreground">
                  Member since{" "}
                  {new Date(info.createdAt).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <p
                className={
                  info?.paymentVerified ? "text-primary" : "text-muted-foreground"
                }
              >
                {info?.paymentVerified
                  ? "✅ Payment Verified"
                  : "⚠ Payment Not Verified"}
              </p>
              {(info?.avgRating ?? 0) > 0 && (
                <p className="text-foreground">
                  ⭐ {info!.avgRating.toFixed(1)}{" "}
                  <span className="text-muted-foreground">
                    ({info!.reviewCount} review
                    {info!.reviewCount === 1 ? "" : "s"})
                  </span>
                </p>
              )}
              <p className="text-foreground">
                {money(info?.totalSpent ?? 0)}{" "}
                <span className="text-muted-foreground">spent</span>
              </p>
              <p className="text-foreground">
                {info?.jobsPosted ?? 0}{" "}
                <span className="text-muted-foreground">
                  job{(info?.jobsPosted ?? 0) === 1 ? "" : "s"} posted
                </span>
              </p>
              <p className="text-foreground">
                {info?.hireRate ?? 0}%{" "}
                <span className="text-muted-foreground">hire rate</span>
              </p>
              <p className="text-foreground">
                {info?.openJobs ?? 0}{" "}
                <span className="text-muted-foreground">
                  open job{(info?.openJobs ?? 0) === 1 ? "" : "s"}
                </span>
              </p>
            </div>

            <form action={openOfferChat.bind(null, offer.id)} className="mt-5">
              <button className="w-full bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90">
                💬 Open Chat with Client
              </button>
            </form>
            {job?.id && (
              <Link
                href={`/jobs/${job.id}`}
                className="block text-center w-full border border-border text-foreground rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-secondary mt-3"
              >
                📋 View Job Posting
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
