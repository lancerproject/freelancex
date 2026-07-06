// Membership model — the single source of truth for a freelancer's plan state.
// Plain module (no "use server") so both client and server can import it.
//
// IMPORTANT: getMembership() applies a *lazy downgrade* — a Pro plan only
// counts as active if the period hasn't ended. This keeps feature gating
// correct even if the renewal/downgrade cron never runs.

import { asPlan, type Plan } from "./fees";

export const MEMBERSHIP_PRICE = 20; // USD / month
export const PERIOD_DAYS = 30;
export const GRACE_DAYS = 3;

export type MembershipStatus =
  | "inactive"
  | "active"
  | "cancelled"
  | "past_due"
  | "expired";

export type Membership = {
  plan: Plan;
  status: MembershipStatus;
  isPro: boolean; // effective access right now
  cancelled: boolean; // cancelled but still within the paid period
  startDate: string | null;
  endDate: string | null;
  renewsOn: string | null; // next billing date (null once cancelled)
  autorenew: boolean;
  lastPaymentMethod: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMembership(profile: any): Membership {
  const plan = asPlan(profile?.plan);
  const status = (profile?.membership_status ?? "inactive") as MembershipStatus;
  const endDate: string | null = profile?.membership_end_date ?? null;
  const startDate: string | null = profile?.membership_start_date ?? null;
  const autorenew = profile?.membership_autorenew !== false;

  const now = Date.now();
  const periodActive = endDate ? new Date(endDate).getTime() > now : false;

  // Effective Pro access: on the Pro plan AND either currently active, or
  // cancelled/past_due but still inside the paid-through period.
  const isPro =
    plan === "pro" &&
    (status === "active" ||
      ((status === "cancelled" || status === "past_due") && periodActive));

  const cancelled = status === "cancelled";

  return {
    plan: isPro ? "pro" : "basic",
    status,
    isPro,
    cancelled,
    startDate,
    endDate,
    renewsOn: status === "active" && autorenew ? endDate : null,
    autorenew,
    lastPaymentMethod: profile?.last_payment_method ?? null,
  };
}

// Format a date for membership copy (e.g. "Aug 1, 2026").
export function formatMembershipDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Add days to a date, returning an ISO string.
export function addDays(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
