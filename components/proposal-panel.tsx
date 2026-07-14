"use client";

import { useState } from "react";
import Link from "next/link";
import { ProBadge } from "@/components/pro-badge";
import { talentBadgeMeta } from "@/lib/talent-badges";
import { earnedLabel } from "@/lib/earned-label";
import { durationLabel } from "@/lib/categories";
import { LocalTime } from "@/components/local-time";
import { PortfolioSection } from "@/components/portfolio-section";
import {
  hireFreelancer,
  shortlistProposal,
  archiveProposal,
} from "@/app/proposals/actions";
import { messageFreelancer } from "@/app/(dashboard)/jobs/actions";
import type { ProposalPanelData } from "@/app/(dashboard)/jobs/client-actions";

const TABS = [
  { key: "cover", label: "Cover letter" },
  { key: "history", label: "Employment history" },
  { key: "portfolio", label: "Portfolio" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
] as const;

// The client's proposal detail — freelancer profile + their proposal, with
// Message / Hire / Shortlist / Archive. Rendered inside the review slide-in
// panel AND on the standalone deep-link page, so there's one source of truth.
export function ProposalPanel({
  data,
  onClose,
}: {
  data: ProposalPanelData;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("cover");
  const tb = talentBadgeMeta(data.talentBadge);
  const isPending = data.status === "pending";
  const isAccepted = data.status === "accepted";
  // Show the duration the freelancer actually picked ("1 to 3 months"), not a
  // days conversion. Fall back to the delivery-days estimate only if missing.
  const dur =
    durationLabel(data.duration) ||
    (data.deliveryDays ? `${data.deliveryDays} days` : null);

  return (
    <div className="p-5 lg:p-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/jobs/${data.jobId}?tab=proposals`}
          className="text-sm text-primary hover:underline"
          onClick={
            onClose
              ? (e) => {
                  e.preventDefault();
                  onClose();
                }
              : undefined
          }
        >
          ← Back to proposals
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 mt-4 text-center">
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.avatarUrl}
            alt=""
            className="w-24 h-24 rounded-full object-cover border border-border mx-auto"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold mx-auto">
            {data.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground mt-4 flex items-center justify-center gap-2 flex-wrap">
          {data.name}
          {data.isPro && <ProBadge size="sm" />}
          {tb && (
            <span
              title={tb.title}
              className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${tb.className}`}
            >
              {tb.icon} {tb.label}
            </span>
          )}
        </h1>
        {data.title && (
          <p className="text-muted-foreground mt-1">{data.title}</p>
        )}
        <Link
          href={`/profile/${data.freelancerId}`}
          className="text-primary hover:underline font-medium text-sm mt-2 inline-block"
        >
          View full profile
        </Link>
        <p className="text-sm text-foreground mt-3">
          {data.location || "Location not set"}
          {" · "}
          <LocalTime timezone={data.timezone ?? undefined} /> local time
        </p>
        <div className="flex items-center justify-center gap-6 mt-2 text-sm">
          <span className="font-semibold text-foreground">
            {earnedLabel(data.earned)}
          </span>
          {data.jss > 0 && (
            <span className="text-muted-foreground">
              {Math.round(data.jss)}% Job Success
            </span>
          )}
        </div>

        {/* Message / Hire */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {!isAccepted &&
            (data.convoId ? (
              <Link
                href={`/messages/${data.convoId}`}
                className="border border-primary text-primary px-8 py-2.5 rounded-full font-semibold hover:bg-primary/10"
              >
                Message
              </Link>
            ) : (
              <form
                action={messageFreelancer.bind(
                  null,
                  data.jobId,
                  data.freelancerId
                )}
              >
                <button className="border border-primary text-primary px-8 py-2.5 rounded-full font-semibold hover:bg-primary/10">
                  Message
                </button>
              </form>
            ))}
          {isPending ? (
            <form action={hireFreelancer.bind(null, data.proposalId)}>
              <button className="bg-primary text-primary-foreground px-10 py-2.5 rounded-full font-semibold hover:opacity-90">
                Hire
              </button>
            </form>
          ) : isAccepted ? (
            <span className="text-primary font-semibold">Hired ✓</span>
          ) : null}
        </div>

        {/* Shortlist / Archive */}
        {!isAccepted && (
          <div className="flex items-center justify-center gap-8 mt-5">
            <form
              action={shortlistProposal.bind(
                null,
                data.proposalId,
                data.jobId,
                !data.shortlisted
              )}
            >
              <button
                className={`flex flex-col items-center text-xs ${
                  data.shortlisted
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-lg">👍</span>
                {data.shortlisted ? "Shortlisted" : "Shortlist"}
              </button>
            </form>
            <form
              action={archiveProposal.bind(
                null,
                data.proposalId,
                data.jobId,
                !data.archived
              )}
            >
              <button className="flex flex-col items-center text-xs text-muted-foreground hover:text-foreground">
                <span className="text-lg">{data.archived ? "↩" : "👎"}</span>
                {data.archived ? "Restore" : "Archive"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mt-8 mb-6 text-sm overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 whitespace-nowrap ${
              tab === t.key
                ? "border-b-2 border-foreground text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cover" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h3 className="text-xl font-bold text-foreground">Cover letter</h3>
            <div className="flex gap-6 text-right">
              {data.bid != null && (
                <div>
                  <p className="font-semibold text-foreground">${data.bid}</p>
                  <p className="text-xs text-muted-foreground">Proposed rate</p>
                </div>
              )}
              {dur && (
                <div>
                  <p className="font-semibold text-foreground">{dur}</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              )}
              {data.languages.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground">
                    {data.languages
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .map((l: any) => l.language || l)
                      .slice(0, 2)
                      .join(", ")}
                    {data.languages.length > 2
                      ? ` +${data.languages.length - 2}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Language</p>
                </div>
              )}
            </div>
          </div>
          <p className="text-foreground whitespace-pre-line mt-4 leading-relaxed">
            {data.coverLetter || "No cover letter provided."}
          </p>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-xl font-bold text-foreground">
            Employment history
          </h3>
          {data.employment.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No employment history added.
            </p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.employment.map((e: any, i: number) => {
              const from = [e.from_month, e.from_year]
                .filter(Boolean)
                .join(" ");
              const to = e.current
                ? "Present"
                : [e.to_month, e.to_year].filter(Boolean).join(" ");
              return (
                <div
                  key={i}
                  className="border-b border-border last:border-0 pb-4 last:pb-0"
                >
                  <p className="font-semibold text-foreground">
                    {[e.title, e.company].filter(Boolean).join(" | ")}
                  </p>
                  {(from || to) && (
                    <p className="text-sm text-muted-foreground">
                      {[from, to].filter(Boolean).join(" - ")}
                    </p>
                  )}
                  {e.description && (
                    <p className="text-sm text-foreground mt-1 whitespace-pre-line">
                      {e.description}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "portfolio" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Portfolio</h3>
          {data.portfolio.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No portfolio items added.
            </p>
          ) : (
            <PortfolioSection items={data.portfolio} isSelf={false} />
          )}
        </div>
      )}

      {tab === "education" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-xl font-bold text-foreground">Education</h3>
          {data.education.length === 0 ? (
            <p className="text-muted-foreground text-sm">No education added.</p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.education.map((e: any, i: number) => (
              <div
                key={i}
                className="border-b border-border last:border-0 pb-4 last:pb-0"
              >
                <p className="font-semibold text-foreground">{e.school}</p>
                {e.degree && (
                  <p className="text-sm text-muted-foreground">{e.degree}</p>
                )}
                {(e.start_year || e.end_year) && (
                  <p className="text-sm text-muted-foreground">
                    {[e.start_year, e.end_year].filter(Boolean).join(" - ")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Skills</h3>
          {data.skills.length === 0 ? (
            <p className="text-muted-foreground text-sm">No skills listed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s: string) => (
                <span
                  key={s}
                  className="text-sm bg-secondary text-foreground rounded-full px-3 py-1.5"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
