// Job Success Score (JSS) — Xwork's measure of how happy clients are with a
// freelancer's work over time. It's a 0–100 score, earned only after a
// freelancer has enough history to be meaningful.
//
// This is an original formula (not Upwork's), built from on-platform signals:
//   • client satisfaction   — average star rating from completed contracts (80%)
//   • completion            — finished vs. cancelled/disputed contracts (20%)
//   • relationships         — a small bonus for repeat clients
//
// A freelancer must have completed ≥2 jobs for ≥2 different clients and have at
// least one review before a score is shown.

export type JssInput = {
  ratings: number[]; // client star ratings (1–5) on completed contracts
  completed: number; // completed contracts
  cancelled: number; // cancelled or disputed contracts
  distinctClients: number; // number of unique clients
  repeatClients: number; // clients with more than one contract
};

export type JssResult = {
  score: number | null; // 0–100, or null until eligible
  eligible: boolean;
  needed: string[]; // what's still required to earn a score
};

export const JSS_MIN_JOBS = 2;
export const JSS_MIN_CLIENTS = 2;

export function computeJss(i: JssInput): JssResult {
  const needed: string[] = [];
  if (i.completed < JSS_MIN_JOBS)
    needed.push(`Complete at least ${JSS_MIN_JOBS} jobs`);
  if (i.distinctClients < JSS_MIN_CLIENTS)
    needed.push(`Work with at least ${JSS_MIN_CLIENTS} different clients`);
  if (i.ratings.length < 1) needed.push("Receive at least 1 client review");

  if (needed.length > 0) return { score: null, eligible: false, needed };

  const avg = i.ratings.reduce((s, r) => s + r, 0) / i.ratings.length; // 1–5
  const satisfaction = Math.max(0, Math.min(1, avg / 5)); // 0–1
  const outcomes = i.completed + i.cancelled;
  const completionRate = outcomes > 0 ? i.completed / outcomes : 1;
  const relationshipBonus = i.repeatClients > 0 ? 1 : 0.95;

  const raw = (satisfaction * 0.8 + completionRate * 0.2) * relationshipBonus;
  const score = Math.round(Math.min(100, Math.max(0, raw * 100)));
  return { score, eligible: true, needed: [] };
}

// Color band for displaying a score (Tailwind text classes).
export function jssBand(score: number): { label: string; tone: string } {
  if (score >= 90) return { label: "Top Rated", tone: "text-primary" };
  if (score >= 75) return { label: "Rising Talent", tone: "text-primary" };
  if (score >= 50) return { label: "Building", tone: "text-amber-500" };
  return { label: "Needs work", tone: "text-red-500" };
}
