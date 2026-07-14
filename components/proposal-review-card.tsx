import Link from "next/link";
import { shortlistProposal, archiveProposal } from "@/app/proposals/actions";
import { ProBadge } from "@/components/pro-badge";
import { talentBadgeMeta } from "@/lib/talent-badges";
import { earnedLabel } from "@/lib/earned-label";
import { ProposalOpener } from "@/components/proposal-opener";
import { QuickMessageButton } from "@/components/quick-message-button";

// One proposal on the client's "Review proposals" page — mirrors Upwork's
// applicant card: avatar, name/title/location, rate, cover letter, skills, and
// the 👍 shortlist / 👎 archive / Message / Hire actions.
export function ProposalReviewCard({
  p,
  jobId,
  earned = 0,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any;
  jobId: string;
  convoId?: string | null;
  earned?: number;
}) {
  const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
  const jss = Number(prof?.jss_score) || 0;
  const loc =
    prof?.location ||
    [prof?.city, prof?.country].filter(Boolean).join(", ");
  // Show the freelancer's profile hourly rate (like Upwork), falling back to
  // their job bid only if they haven't set a rate.
  const rate = prof?.hourly_rate
    ? `$${Number(prof.hourly_rate)}/hr`
    : p.bid_amount
      ? `$${p.bid_amount}`
      : "—";
  const name = prof?.full_name || "Freelancer";
  const skills = String(prof?.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const tb = talentBadgeMeta(prof?.talent_badge);
  const isPending = p.status === "pending";
  const isAccepted = p.status === "accepted";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {prof?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prof.avatar_url}
            alt=""
            className="w-14 h-14 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Name / title / location */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ProposalOpener
              jobId={jobId}
              proposalId={p.id}
              className="font-semibold text-foreground hover:text-primary cursor-pointer"
            >
              {name}
            </ProposalOpener>
            {p.is_pro && <ProBadge size="sm" />}
            {tb && (
              <span
                title={tb.title}
                className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${tb.className}`}
              >
                {tb.icon} {tb.label}
              </span>
            )}
          </div>
          {prof?.title && (
            <p className="text-sm text-muted-foreground truncate">{prof.title}</p>
          )}
          {loc && (
            <p className="text-xs text-muted-foreground mt-0.5">{loc}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isAccepted && (
            <>
              <form
                action={shortlistProposal.bind(
                  null,
                  p.id,
                  jobId,
                  !p.shortlisted
                )}
              >
                <button
                  title={p.shortlisted ? "Remove from shortlist" : "Shortlist"}
                  aria-label="Shortlist"
                  className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                    p.shortlisted
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  👍
                </button>
              </form>
              <form
                action={archiveProposal.bind(null, p.id, jobId, !p.archived)}
              >
                <button
                  title={p.archived ? "Restore" : "Archive"}
                  aria-label="Archive"
                  className="w-9 h-9 rounded-full border border-border text-muted-foreground hover:bg-secondary flex items-center justify-center"
                >
                  {p.archived ? "↩" : "👎"}
                </button>
              </form>
            </>
          )}
          {!isAccepted && (
            <QuickMessageButton
              jobId={jobId}
              freelancerId={p.freelancer_id}
              freelancerName={name}
              className="border border-border text-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-secondary cursor-pointer"
            />
          )}
          {isPending ? (
            <Link
              href={`/offer/new?job=${jobId}&proposal=${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-sm font-semibold hover:opacity-90"
            >
              Hire
            </Link>
          ) : isAccepted ? (
            <span className="text-primary text-sm font-semibold px-2">Hired</span>
          ) : null}
        </div>
      </div>

      {/* Rate · earned · Job Success */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
        <span className="font-medium text-foreground">{rate}</span>
        <span className="text-muted-foreground">{earnedLabel(earned)}</span>
        {jss > 0 && (
          <span className="text-muted-foreground">
            {Math.round(jss)}% Job Success
          </span>
        )}
      </div>

      {/* Cover letter */}
      {p.cover_letter && (
        <p className="text-sm text-foreground mt-2 line-clamp-4">
          {p.cover_letter}
        </p>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {skills.map((s: string) => (
            <span
              key={s}
              className="text-xs bg-secondary text-foreground rounded-full px-2.5 py-1"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Send-offer shortcut for pending proposals */}
      {isPending && (
        <div className="mt-3">
          <Link
            href={`/offer/new?job=${jobId}&proposal=${p.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm font-medium"
          >
            Send offer
          </Link>
        </div>
      )}
    </div>
  );
}
