// Marketplace fee model — the single source of truth for the freelancer fee.
// Basic freelancers pay 10% on job payments (keep 90%). Pro freelancers pay a
// flat 5% (keep 95%). Plain module so both client and server can import it.

export type Plan = "basic" | "pro";

export const BASIC_FEE_RATE = 0.1; // 10%
export const PRO_FEE_RATE = 0.05; // 5%

// Normalise any stored plan value to a known plan.
export function asPlan(plan: string | null | undefined): Plan {
  return plan === "pro" ? "pro" : "basic";
}

// The marketplace fee rate for a plan.
export function feeRate(plan: string | null | undefined): number {
  return asPlan(plan) === "pro" ? PRO_FEE_RATE : BASIC_FEE_RATE;
}

// The fee amount taken from a gross job payment.
export function feeFromGross(gross: number, plan: string | null | undefined): number {
  return round2((Number(gross) || 0) * feeRate(plan));
}

// What the freelancer keeps from a gross job payment.
export function netFromGross(gross: number, plan: string | null | undefined): number {
  return round2((Number(gross) || 0) * (1 - feeRate(plan)));
}

// The fee rate as a whole-number percent (for display, e.g. "10%").
export function feePercent(plan: string | null | undefined): number {
  return Math.round(feeRate(plan) * 100);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
