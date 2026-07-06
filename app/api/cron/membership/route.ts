import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getFreelancerEarnings } from "@/lib/earnings";
import { asPlan } from "@/lib/fees";
import {
  MEMBERSHIP_PRICE,
  PERIOD_DAYS,
  GRACE_DAYS,
  addDays,
  formatMembershipDate,
} from "@/lib/membership";
import { notify } from "@/lib/notify";
import { chargeStripeMembership } from "@/lib/stripe";
import { chargePaypalMembership } from "@/lib/paypal";
import { refreshTalentStats } from "@/lib/stats-refresh";
import { JSS_UPDATE_DAYS } from "@/lib/talent-badges";

// Daily membership maintenance. Protect with CRON_SECRET and hit it from any
// scheduler (Vercel Cron, cron-job.org, GitHub Actions) once a day:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/membership
// Idempotent: safe to run repeatedly. Also runnable manually for testing.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  if (
    !secret ||
    (auth !== `Bearer ${secret}` && headerSecret !== secret)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const summary = {
    renewed: 0,
    past_due: 0,
    downgraded: 0,
    auto_hidden: 0,
    jss_refreshed: 0,
  };

  // Pro members whose period has ended and who need action.
  const { data: due } = await admin
    .from("profiles")
    .select("*")
    .eq("plan", "pro")
    .in("membership_status", ["active", "past_due", "cancelled"])
    .lte("membership_end_date", nowIso);

  for (const p of due ?? []) {
    const status = p.membership_status as string;
    const method = p.last_payment_method as string | null;

    // Cancelled: keep access until the end, then downgrade.
    if (status === "cancelled") {
      await downgrade(admin, p.id);
      summary.downgraded++;
      continue;
    }

    // Auto-renew is off: downgrade at period end.
    if (p.membership_autorenew === false) {
      await downgrade(admin, p.id);
      summary.downgraded++;
      continue;
    }

    // Attempt to charge the renewal by the member's method.
    const charge = await attemptCharge(admin, p, method);

    if (charge.ok) {
      const start = nowIso;
      const end = addDays(now, PERIOD_DAYS);
      await admin.from("membership_payments").insert({
        user_id: p.id,
        amount: MEMBERSHIP_PRICE,
        currency: "usd",
        method: method ?? "balance",
        status: "paid",
        payment_date: start,
        billing_period_start: start,
        billing_period_end: end,
        stripe_payment_intent_id: method === "card" ? charge.reference : null,
        paypal_transaction_id: method === "paypal" ? charge.reference : null,
        note: "Pro membership — auto-renewal",
      });
      await admin
        .from("profiles")
        .update({
          membership_status: "active",
          membership_start_date: start,
          membership_end_date: end,
        })
        .eq("id", p.id);
      await notify(
        admin,
        p.id,
        "account",
        "Pro membership renewed",
        `Your Pro membership renewed for another month. Next renewal: ${formatMembershipDate(
          end
        )}.`,
        "/settings/membership"
      );
      summary.renewed++;
      continue;
    }

    // Charge failed. Enter/continue the grace period; downgrade after it lapses.
    const graceEnds = addDays(new Date(p.membership_end_date), GRACE_DAYS);
    if (new Date(graceEnds).getTime() < now.getTime()) {
      await downgrade(admin, p.id);
      summary.downgraded++;
    } else {
      await admin
        .from("profiles")
        .update({ membership_status: "past_due" })
        .eq("id", p.id);
      await admin.from("membership_payments").insert({
        user_id: p.id,
        amount: MEMBERSHIP_PRICE,
        currency: "usd",
        method: method ?? "balance",
        status: "failed",
        payment_date: nowIso,
        note: charge.error ?? "Renewal charge failed",
      });
      await notify(
        admin,
        p.id,
        "account",
        "Pro renewal failed",
        `We couldn't renew your Pro membership (${
          charge.error ?? "payment failed"
        }). We'll retry during a ${GRACE_DAYS}-day grace period. Update your payment method or top up your balance to keep Pro.`,
        "/settings/membership"
      );
      summary.past_due++;
    }
  }

  // Inactivity auto-hide (Basic only — Pro profiles stay always-active).
  const cutoff = addDays(now, -30);
  const { data: idle } = await admin
    .from("profiles")
    .select("id, plan, profile_visibility, last_active_at, membership_status")
    .eq("role", "freelancer")
    .lt("last_active_at", cutoff);
  for (const p of idle ?? []) {
    if (asPlan(p.plan) === "pro" && p.membership_status === "active") continue; // exempt
    if ((p.profile_visibility ?? "public") !== "public") continue;
    await admin
      .from("profiles")
      .update({ profile_visibility: "private" })
      .eq("id", p.id);
    await notify(
      admin,
      p.id,
      "account",
      "Your profile was hidden",
      "Your profile was set to private after a period of inactivity. Upgrade to Pro to stay always visible, or set it back to public anytime in Settings.",
      "/settings/profile"
    );
    summary.auto_hidden++;
  }

  // Job Success Score & talent badge refresh — every freelancer whose 15-day
  // cycle is due (also awards/revokes badges from the latest data).
  const jssCutoff = addDays(now, -JSS_UPDATE_DAYS);
  const { data: staleJss } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "freelancer")
    .or(`jss_updated_at.is.null,jss_updated_at.lt.${jssCutoff}`)
    .limit(500);
  for (const p of staleJss ?? []) {
    try {
      await refreshTalentStats(p.id);
      summary.jss_refreshed++;
    } catch {
      /* skip and continue */
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attemptCharge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any,
  method: string | null
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  if (method === "card") return chargeStripeMembership(profile);
  if (method === "paypal") return chargePaypalMembership(profile);
  // Balance (default).
  const earnings = await getFreelancerEarnings(
    admin,
    profile.id,
    asPlan(profile.plan)
  );
  if (earnings.available < MEMBERSHIP_PRICE)
    return {
      ok: false,
      error: `insufficient balance ($${earnings.available.toFixed(
        2
      )} available, $${MEMBERSHIP_PRICE.toFixed(2)} needed)`,
    };
  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function downgrade(admin: any, userId: string) {
  await admin
    .from("profiles")
    .update({
      plan: "basic",
      membership_status: "expired",
      custom_slug_active: false, // keep the slug saved but deactivate routing
    })
    .eq("id", userId);
  // Account health: the Pro boost no longer applies — recalc.
  try {
    const { recalcHealth } = await import("@/lib/health");
    await recalcHealth(userId, "membership_expired");
  } catch {
    /* best-effort */
  }
  await notify(
    admin,
    userId,
    "account",
    "Your Pro membership has ended",
    "You're now on the Basic plan. Pro features are locked and your marketplace fee is back to 10%. Upgrade anytime to restore Pro.",
    "/settings/membership"
  );
}
