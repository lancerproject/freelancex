import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { earnedLabel } from "@/lib/earned-label";
import { LocalTime } from "@/components/local-time";
import { ProBadge } from "@/components/pro-badge";
import { talentBadgeMeta } from "@/lib/talent-badges";
import { getMembership } from "@/lib/membership";
import { durationLabel } from "@/lib/categories";
import { PortfolioSection } from "@/components/portfolio-section";
import {
  hireFreelancer,
  shortlistProposal,
  archiveProposal,
} from "@/app/proposals/actions";
import { messageFreelancer } from "@/app/(dashboard)/jobs/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toList(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {
      /* not JSON */
    }
  }
  return [];
}

const TABS = [
  { key: "cover", label: "Cover letter" },
  { key: "history", label: "Employment history" },
  { key: "portfolio", label: "Portfolio" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
] as const;

// Client's proposal detail view — the freelancer's profile + their proposal,
// with Message / Hire / Shortlist / Archive. Mirrors Upwork's proposal slider.
export default async function ProposalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; proposalId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id, proposalId } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab = TABS.some((t) => t.key === tabRaw) ? tabRaw! : "cover";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only the job's client may view its proposals.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();
  if (job.client_id !== user.id) redirect(`/jobs/${id}`);

  const { data: p } = await supabase
    .from("proposals")
    .select("*, profiles ( * )")
    .eq("id", proposalId)
    .eq("job_id", id)
    .maybeSingle();
  if (!p) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof: any = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
  const name = prof?.full_name || "Freelancer";
  const isPro = getMembership(prof).isPro;
  const tb = talentBadgeMeta(prof?.talent_badge);
  const location =
    prof?.location ||
    [prof?.city, prof?.country].filter(Boolean).join(", ");

  // Existing conversation with this freelancer on this job (Message button).
  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", id)
    .or(`participant_1.eq.${p.freelancer_id},participant_2.eq.${p.freelancer_id}`)
    .limit(1);
  const convoId = convo?.[0]?.id ?? null;

  // Lifetime earnings + Job Success (same source as talent search / cards).
  let earned = 0;
  try {
    const admin = createAdminClient();
    const { data: pays } = await admin
      .from("job_payments")
      .select("gross_amount")
      .eq("freelancer_id", p.freelancer_id);
    earned = (pays ?? []).reduce(
      (t, r) => t + (Number(r.gross_amount) || 0),
      0
    );
  } catch {
    /* best-effort */
  }
  const jss = Number(prof?.jss_score) || 0;

  const employment = toList(prof?.employment);
  const education = toList(prof?.education);
  const portfolio = toList(prof?.portfolio);
  const languages = toList(prof?.languages);
  const skills = String(prof?.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isPending = p.status === "pending";
  const isAccepted = p.status === "accepted";

  return (
    <main className="min-h-screen px-4 lg:px-8 py-8 max-w-4xl mx-auto">
      <Link
        href={`/jobs/${id}?tab=proposals`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to proposals
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 mt-4 text-center">
        {prof?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prof.avatar_url}
            alt=""
            className="w-24 h-24 rounded-full object-cover border border-border mx-auto"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold mx-auto">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground mt-4 flex items-center justify-center gap-2 flex-wrap">
          {name}
          {isPro && <ProBadge size="sm" />}
          {tb && (
            <span
              title={tb.title}
              className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${tb.className}`}
            >
              {tb.icon} {tb.label}
            </span>
          )}
        </h1>
        {prof?.title && (
          <p className="text-muted-foreground mt-1">{prof.title}</p>
        )}
        <Link
          href={`/profile/${p.freelancer_id}`}
          className="text-primary hover:underline font-medium text-sm mt-2 inline-block"
        >
          View full profile
        </Link>
        <p className="text-sm text-foreground mt-3">
          {location || "Location not set"}
          {" · "}
          <LocalTime timezone={prof?.timezone ?? undefined} /> local time
        </p>
        <div className="flex items-center justify-center gap-6 mt-2 text-sm">
          <span className="font-semibold text-foreground">
            {earnedLabel(earned)}
          </span>
          {jss > 0 && (
            <span className="text-muted-foreground">
              {Math.round(jss)}% Job Success
            </span>
          )}
        </div>

        {/* Message / Hire */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {!isAccepted &&
            (convoId ? (
              <Link
                href={`/messages/${convoId}`}
                className="border border-primary text-primary px-8 py-2.5 rounded-full font-semibold hover:bg-primary/10"
              >
                Message
              </Link>
            ) : (
              <form action={messageFreelancer.bind(null, id, p.freelancer_id)}>
                <button className="border border-primary text-primary px-8 py-2.5 rounded-full font-semibold hover:bg-primary/10">
                  Message
                </button>
              </form>
            ))}
          {isPending ? (
            <form action={hireFreelancer.bind(null, p.id)}>
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
            <form action={shortlistProposal.bind(null, p.id, id, !p.shortlisted)}>
              <button
                className={`flex flex-col items-center text-xs ${
                  p.shortlisted ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-lg">👍</span>
                {p.shortlisted ? "Shortlisted" : "Shortlist"}
              </button>
            </form>
            <form action={archiveProposal.bind(null, p.id, id, !p.archived)}>
              <button className="flex flex-col items-center text-xs text-muted-foreground hover:text-foreground">
                <span className="text-lg">{p.archived ? "↩" : "👎"}</span>
                {p.archived ? "Restore" : "Archive"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mt-8 mb-6 text-sm overflow-x-auto hide-scrollbar">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/jobs/${id}/proposals/${proposalId}?tab=${t.key}`}
            className={`pb-2 whitespace-nowrap ${
              tab === t.key
                ? "border-b-2 border-foreground text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Cover letter */}
      {tab === "cover" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h3 className="text-xl font-bold text-foreground">Cover letter</h3>
            <div className="flex gap-6 text-right">
              <div>
                <p className="font-semibold text-foreground">${p.bid_amount}</p>
                <p className="text-xs text-muted-foreground">Proposed rate</p>
              </div>
              {(durationLabel(p.duration) || p.delivery_days) && (
                <div>
                  <p className="font-semibold text-foreground">
                    {durationLabel(p.duration) || `${p.delivery_days} days`}
                  </p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              )}
              {languages.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground">
                    {languages
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .map((l: any) => l.language || l)
                      .slice(0, 2)
                      .join(", ")}
                    {languages.length > 2 ? ` +${languages.length - 2}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Language</p>
                </div>
              )}
            </div>
          </div>
          <p className="text-foreground whitespace-pre-line mt-4 leading-relaxed">
            {p.cover_letter || "No cover letter provided."}
          </p>
          {Array.isArray(p.screening_answers) &&
            p.screening_answers.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <h4 className="font-semibold text-foreground mb-3">
                  Screening questions
                </h4>
                <div className="space-y-4">
                  {(
                    p.screening_answers as {
                      question: string;
                      answer: string;
                    }[]
                  ).map((qa, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-foreground">
                        {qa.question}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                        {qa.answer || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Employment history */}
      {tab === "history" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-xl font-bold text-foreground">Employment history</h3>
          {employment.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No employment history added.
            </p>
          ) : (
            employment.map((e, i) => {
              const from = [e.from_month, e.from_year].filter(Boolean).join(" ");
              const to = e.current
                ? "Present"
                : [e.to_month, e.to_year].filter(Boolean).join(" ");
              return (
                <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
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

      {/* Portfolio */}
      {tab === "portfolio" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Portfolio</h3>
          {portfolio.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No portfolio items added.
            </p>
          ) : (
            <PortfolioSection items={portfolio} isSelf={false} />
          )}
        </div>
      )}

      {/* Education */}
      {tab === "education" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-xl font-bold text-foreground">Education</h3>
          {education.length === 0 ? (
            <p className="text-muted-foreground text-sm">No education added.</p>
          ) : (
            education.map((e, i) => (
              <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
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

      {/* Skills */}
      {tab === "skills" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Skills</h3>
          {skills.length === 0 ? (
            <p className="text-muted-foreground text-sm">No skills listed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
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
    </main>
  );
}
