import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { computeJss, jssBand } from "@/lib/jss";

export default async function JobSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Distinct clients + completed jobs (the two starter requirements).
  const { data: contracts } = await supabase
    .from("contracts")
    .select("client_id, status")
    .eq("freelancer_id", user.id);
  const list = contracts ?? [];
  const clientCount = new Set(list.map((c) => c.client_id)).size;
  const jobsCompleted = list.filter((c) => c.status === "completed").length;
  const jobsCancelled = list.filter(
    (c) => c.status === "cancelled" || c.status === "disputed"
  ).length;
  // Repeat clients = clients who appear on more than one contract.
  const perClient: Record<string, number> = {};
  for (const c of list) perClient[c.client_id] = (perClient[c.client_id] ?? 0) + 1;
  const repeatClients = Object.values(perClient).filter((n) => n > 1).length;

  // Client ratings (1–5) on this freelancer's contracts.
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", user.id);
  const ratings = (myReviews ?? [])
    .map((r) => Number(r.rating))
    .filter((n) => n >= 1 && n <= 5);

  const jss = computeJss({
    ratings,
    completed: jobsCompleted,
    cancelled: jobsCancelled,
    distinctClients: clientCount,
    repeatClients,
  });
  const band = jss.score != null ? jssBand(jss.score) : null;

  const Requirement = ({
    title,
    have,
    need,
    unit,
  }: {
    title: string;
    have: number;
    need: number;
    unit: string;
  }) => {
    const done = have >= need;
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="font-medium text-foreground">{title}</p>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, (have / need) * 100)}%` }}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground mt-1">
          {have}/{need}
        </p>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className={done ? "text-primary" : "text-muted-foreground"}>
            {done ? "✓ Completed" : "○ Not completed"}
          </span>
          <span className="text-muted-foreground">
            {have} {unit}
          </span>
        </div>
      </div>
    );
  };

  const factors = [
    {
      title: "Client satisfaction",
      body: "Great ratings and positive feedback from clients lift your score the most.",
    },
    {
      title: "Long-term relationships",
      body: "Repeat work and relationships longer than 90 days strengthen your score.",
    },
    {
      title: "Higher earnings",
      body: "Completing higher-value contracts successfully has a positive effect.",
    },
    {
      title: "Contract length",
      body: "Finishing what you start — and avoiding cancelled contracts — matters.",
    },
  ];

  return (
    <main className="min-h-screen px-4 lg:px-16 py-8 w-full">
      <p className="text-sm text-muted-foreground mb-4">
        <Link href="/stats" className="hover:underline">
          Stats
        </Link>{" "}
        / Job success insights
      </p>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 max-w-[1100px]">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground">
            Job success insights
          </h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Your job success score reflects how happy clients are with your work
            over time. It updates regularly, and a strong score helps you stand
            out and win more work.
          </p>
        </div>
        <div className="text-center shrink-0">
          <div
            className={`w-28 h-28 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${
              jss.score != null
                ? "border-primary text-primary"
                : "border-secondary text-muted-foreground"
            }`}
          >
            {jss.score != null ? `${jss.score}%` : "—"}
          </div>
          <p className="text-sm text-foreground mt-2">
            {band ? band.label : "No score yet"}
          </p>
        </div>
      </div>

      {/* Requirements (only until a score is earned) */}
      {jss.score == null ? (
        <div className="max-w-[1100px] mt-8">
          <h2 className="text-xl font-bold text-foreground">
            How do I earn a score?
          </h2>
          <p className="text-muted-foreground mt-1 mb-4">
            Meet these milestones to earn your first job success score.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Requirement
              title="Work with 2 different clients"
              have={clientCount}
              need={2}
              unit="clients"
            />
            <Requirement
              title="Complete 2 jobs"
              have={jobsCompleted}
              need={2}
              unit="jobs"
            />
          </div>
          <Link
            href="/dashboard"
            className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
          >
            Find jobs
          </Link>
        </div>
      ) : (
        <div className="max-w-[1100px] mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="font-semibold text-foreground">
            🎉 You&apos;ve earned a Job Success Score of {jss.score}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Based on {jobsCompleted} completed job{jobsCompleted === 1 ? "" : "s"}{" "}
            with {clientCount} client{clientCount === 1 ? "" : "s"}. Keep ratings
            high and finish what you start to grow it.
          </p>
        </div>
      )}

      {/* What impacts your score */}
      <div className="max-w-[1100px] mt-10">
        <h2 className="text-xl font-bold text-foreground mb-4">
          What impacts your score
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factors.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="font-medium text-foreground">{f.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
