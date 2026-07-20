import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { StarRatingInput } from "@/components/star-rating-input";
import { submitReview } from "@/app/reviews/actions";

export const metadata = { title: "Leave feedback | Xwork" };

const REASONS = [
  "Work completed successfully",
  "The engagement ended as planned",
  "Great to work with — would work together again",
  "Timeline or scope changed",
  "Ran out of budget",
  "Work didn't meet expectations",
  "Communication issues",
  "Other",
];

export default async function LeaveFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/contracts/${id}/feedback`);

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, freelancer_id, title, rate_type, status")
    .eq("id", id)
    .maybeSingle();
  if (!contract) notFound();

  const isClient = user.id === contract.client_id;
  const isFreelancer = user.id === contract.freelancer_id;
  if (!isClient && !isFreelancer) redirect(`/contracts/${id}`);

  const otherId = isClient ? contract.freelancer_id : contract.client_id;
  const { data: other } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", otherId)
    .maybeSingle();
  const otherName = other?.full_name || other?.username || "Member";
  const initials = otherName.slice(0, 2).toUpperCase();

  // Already left feedback on this contract?
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("contract_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  // Who they're rating + who the public comment helps.
  const ratingLabel = isClient ? "Freelancer rating" : "Client rating";
  const audience = isClient ? "clients" : "freelancers";
  const rateType =
    contract.rate_type === "hourly" ? "Hourly" : "Fixed-price";

  const action = submitReview.bind(null, id, otherId);

  return (
    <main className="min-h-screen px-4 lg:px-12 py-10 w-full">
      <div className="max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* ---------------- Main ---------------- */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leave feedback</h1>

          {existing ? (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="text-lg font-semibold text-foreground">
                You&apos;ve already left feedback
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Thanks — your review is recorded. It appears on {otherName}
                &apos;s profile once you both submit, or when the 14-day feedback
                window ends.
              </p>
              <Link
                href={`/contracts/${id}?tab=details`}
                className="inline-block mt-5 text-primary font-semibold hover:underline"
              >
                Back to contract →
              </Link>
            </div>
          ) : (
            <form action={action} className="mt-6 space-y-8">
              {/* Reason */}
              <div>
                <label
                  htmlFor="reason"
                  className="block font-semibold text-foreground"
                >
                  Can you tell us your primary reason for ending this contract?
                </label>
                <select
                  id="reason"
                  name="reason"
                  defaultValue=""
                  className="mt-2 w-full max-w-md bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <hr className="border-border" />

              {/* Public review */}
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Leave a review
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your review will appear on {otherName}&apos;s profile after
                  they provide their feedback, or when the 14-day feedback
                  period ends. Your insights help other {audience} work with
                  confidence.
                </p>

                <p className="mt-5 font-semibold text-foreground">
                  {ratingLabel}
                </p>
                <div className="mt-2">
                  <StarRatingInput name="rating" required />
                </div>

                <label
                  htmlFor="comment"
                  className="block mt-6 font-semibold text-foreground"
                >
                  What would you like other {audience} to know about your
                  experience?
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  maxLength={5000}
                  rows={6}
                  placeholder="Your comments will be shared publicly."
                  className="mt-2 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Private note (optional) */}
              <details className="group">
                <summary className="cursor-pointer font-semibold text-foreground list-none flex items-center gap-2">
                  <span className="text-primary">+</span> Share a private note
                  with {otherName}{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </summary>
                <p className="text-sm text-muted-foreground mt-2">
                  Only {otherName} will be able to see your note. It won&apos;t
                  affect their public reputation.
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  Private rating (optional)
                </p>
                <div className="mt-1">
                  <StarRatingInput name="private_rating" size="text-2xl" />
                </div>
                <textarea
                  name="private_comment"
                  maxLength={5000}
                  rows={4}
                  placeholder="Share private, constructive feedback…"
                  className="mt-3 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </details>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground rounded-full px-7 py-2.5 font-semibold hover:opacity-90"
                >
                  Submit feedback
                </button>
                <Link
                  href={`/contracts/${id}?tab=details`}
                  className="text-primary font-semibold hover:underline"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* ---------------- Contract card ---------------- */}
        <aside>
          <div className="rounded-2xl border border-border bg-card p-6">
            {other?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={other.avatar_url}
                alt={otherName}
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-secondary text-foreground flex items-center justify-center text-lg font-bold">
                {initials}
              </div>
            )}
            <h3 className="mt-4 text-lg font-bold text-foreground">
              {contract.title || "Contract"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {rateType} contract with {otherName}.
            </p>
            <Link
              href={`/contracts/${id}`}
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              View contract →
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
