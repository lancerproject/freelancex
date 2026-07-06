import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { refreshTalentStats } from "@/lib/stats-refresh";
import {
  risingTalentChecks,
  topRatedChecks,
  topRatedPlusChecks,
  talentBadgeMeta,
  badgeBanned,
  JSS_UPDATE_DAYS,
  type BadgeEligibility,
} from "@/lib/talent-badges";

export const metadata = { title: "Talent badges | Xwork" };

export default async function BadgesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const talent = await refreshTalentStats(user.id);
  if (!talent) redirect("/dashboard");

  const current = talentBadgeMeta(talent.badge);
  const banned = badgeBanned(talent.inputs);
  const banDate = talent.inputs.badgeBanUntil
    ? new Date(talent.inputs.badgeBanUntil).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const tiers: {
    meta: NonNullable<ReturnType<typeof talentBadgeMeta>>;
    desc: string;
    benefits: string[];
    elig: BadgeEligibility;
  }[] = [
    {
      meta: talentBadgeMeta("rising_talent")!,
      desc: "Shows clients you're one of the most promising new freelancers on Xwork — strong early feedback and a complete, verified profile.",
      benefits: [
        "Rising Talent badge on your profile, proposals and search results",
        "Stands out to clients before you've earned a Job Success Score",
      ],
      elig: risingTalentChecks(talent.inputs),
    },
    {
      meta: talentBadgeMeta("top_rated")!,
      desc: "Earned by consistently delighting your clients. Top Rated freelancers represent the top tier of Xwork talent, re-checked every 15 days.",
      benefits: [
        "Top Rated badge on your profile, proposals and search results",
        "Greater visibility and trust with clients reviewing proposals",
      ],
      elig: topRatedChecks(talent.inputs),
    },
    {
      meta: talentBadgeMeta("top_rated_plus")!,
      desc: "Proven success on large contracts, time after time. Top Rated Plus marks the very best on Xwork.",
      benefits: [
        "Top Rated Plus badge on your profile, proposals and search results",
        "Priority support from the Xwork team",
      ],
      elig: topRatedPlusChecks(talent.inputs),
    },
  ];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <div className="max-w-[860px]">
        <h1 className="text-3xl font-bold text-foreground">Talent badges</h1>
        <p className="text-muted-foreground mt-1">
          Badges tell clients your track record at a glance. Eligibility is
          re-checked automatically every {JSS_UPDATE_DAYS} days — no action
          needed from you.
        </p>

        {/* Current status */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
          <span className="text-4xl" aria-hidden>
            {current ? current.icon : "🔎"}
          </span>
          <div>
            <p className="font-semibold text-foreground">
              {current
                ? `You're ${
                    current.key === "rising_talent" ? "a" : ""
                  } ${current.label}`
                : "No badge yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {current
                ? current.title
                : "Meet every requirement below and the badge is applied automatically."}
            </p>
          </div>
        </div>

        {/* Policy-violation ban */}
        {banned && banDate && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm">
            <p className="font-semibold text-foreground">
              Badges paused until {banDate}
            </p>
            <p className="text-muted-foreground mt-1">
              Taking or requesting payment outside Xwork removes your badge and
              pauses eligibility for six months. Keeping all payments on Xwork
              protects you and restores eligibility automatically.
            </p>
          </div>
        )}

        {/* Tiers */}
        <div className="mt-6 space-y-6">
          {tiers.map((t) => {
            const met = t.elig.checks.filter((c) => c.met).length;
            const isCurrent = current?.key === t.meta.key;
            return (
              <section
                key={t.meta.key}
                className={`rounded-2xl border bg-card p-6 ${
                  isCurrent ? "border-primary ring-1 ring-primary/30" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <span aria-hidden>{t.meta.icon}</span> {t.meta.label}
                  </h2>
                  {isCurrent ? (
                    <span className="text-xs font-semibold bg-primary/15 text-primary rounded-full px-3 py-1">
                      Your current badge
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {met}/{t.elig.checks.length} requirements met
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{t.desc}</p>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Requirements
                  </p>
                  <ul className="space-y-1.5">
                    {t.elig.checks.map((c) => (
                      <li key={c.label} className="flex items-start gap-2 text-sm">
                        <span
                          aria-hidden
                          className={c.met ? "text-primary" : "text-muted-foreground"}
                        >
                          {c.met ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            c.met ? "text-foreground" : "text-muted-foreground"
                          }
                        >
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Benefits
                  </p>
                  <ul className="space-y-1.5">
                    {t.benefits.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-primary" aria-hidden>
                          •
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Keep all payments and communication on Xwork. Moving work off-platform
          removes badges and pauses eligibility for six months.
        </p>
      </div>
    </main>
  );
}
