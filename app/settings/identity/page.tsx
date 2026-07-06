import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { IdentityVerification } from "@/components/identity-verification";

export const metadata = { title: "Identity verification | Xwork" };

// The steps mirror the actual Xwork verification wizard.
const STEPS = [
  {
    title: "Appear on camera",
    desc: "Take a quick live selfie so we can confirm it's really you.",
  },
  {
    title: "Show a government-issued photo ID",
    desc: "We check that the country on your ID matches the country on your profile.",
  },
  {
    title: "Confirm your details",
    desc: "Enter your legal name and ID details exactly as they appear on your document.",
  },
  {
    title: "Submit for identity review",
    desc: "If we can't verify you instantly, we'll start a quick manual review.",
  },
];

function addYears(iso: string, years: number): Date {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function IdentityVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, id_verified, id_verified_at, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Manual-review columns queried separately so the page still renders even
  // if the identity-review migration hasn't run yet.
  let reviewStatus: string | null = null;
  let reviewNote: string | null = null;
  try {
    const { data: review } = await supabase
      .from("profiles")
      .select("id_review_status, id_review_note")
      .eq("id", user.id)
      .maybeSingle();
    reviewStatus = review?.id_review_status ?? null;
    reviewNote = review?.id_review_note ?? null;
  } catch {
    /* columns not there yet */
  }

  const isFreelancer = profile?.role === "freelancer";
  const verified = !!profile?.id_verified;
  const underReview = !verified && reviewStatus === "pending";
  const validUntil = profile?.id_verified_at
    ? fmtDate(addYears(profile.id_verified_at, 3))
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">
        Identity verification
      </h2>

      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <h3 className="text-2xl font-bold text-foreground">
          Stand out to clients. Build trust. Get hired faster.
        </h3>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          An identity verification badge helps you stand out in client search
          results and shows clients they can trust who they&apos;re hiring.
        </p>

        {/* Status block — exists ONLY after verification */}
        {verified && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Your status:</p>
            <div className="mt-2 space-y-2">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px]">
                  ✓
                </span>
                Verified
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <span aria-hidden>👁</span> Visible to clients
              </p>
            </div>
            {validUntil && (
              <>
                <p className="text-sm text-muted-foreground mt-4">Valid until:</p>
                <p className="font-medium text-foreground mt-1">{validUntil}</p>
              </>
            )}
          </div>
        )}

        {/* How it works — checked once verified, otherwise shown as the path ahead */}
        <div className="mt-8">
          <h4 className="text-xl font-bold text-foreground">How it works</h4>
          <ol className="mt-4 space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                    verified
                      ? "bg-primary text-white"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {verified ? "✓" : i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-muted-foreground mt-8 border-t border-border pt-5">
          Your verification badge stays active for 3 years. We&apos;ll remind you
          when it&apos;s time to renew.
        </p>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
          <span aria-hidden>🔒</span>
          We encrypt your data and share it securely with our ID verification
          partner.{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Manual review in progress — no resubmission needed */}
      {isFreelancer && underReview && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
          <p className="font-semibold text-foreground">
            🕐 Manual review in progress
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your documents were received and our team is reviewing them —
            usually within 24 hours. We&apos;ll notify you the moment
            it&apos;s done. There&apos;s nothing more you need to do.
          </p>
        </div>
      )}

      {/* Rejected — explain why and let them try again */}
      {isFreelancer && !verified && reviewStatus === "rejected" && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
          <p className="font-semibold text-foreground">
            We couldn&apos;t verify your documents
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {reviewNote ||
              "The documents were unclear or didn't match the account details."}{" "}
            Please try again below with clear, well-lit photos.
          </p>
        </div>
      )}

      {/* Verification flow — only for an unverified freelancer not in review */}
      {isFreelancer && !verified && !underReview && (
        <IdentityVerification profilePhoto={profile?.avatar_url ?? null} />
      )}

      {!isFreelancer && !verified && (
        <p className="text-sm text-muted-foreground">
          Clients don&apos;t need to verify their identity to post jobs and hire.
        </p>
      )}
    </div>
  );
}
