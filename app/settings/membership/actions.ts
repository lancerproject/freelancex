"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getFreelancerEarnings } from "@/lib/earnings";
import { asPlan } from "@/lib/fees";
import {
  getMembership,
  MEMBERSHIP_PRICE,
  PERIOD_DAYS,
  addDays,
  formatMembershipDate,
} from "@/lib/membership";
import { notify } from "@/lib/notify";

type Result = { ok: boolean; error?: string; available?: number };

async function authedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile };
}

// Upgrade to Pro. `method` picks how the $20 is paid. Balance is fully
// functional now; card/paypal require the payment gateway keys (Settings →
// Billing) and are charged via their saved method.
export async function upgradePro(
  method: "balance" | "card" | "paypal"
): Promise<Result> {
  const { supabase, user, profile } = await authedProfile();
  if (!user || !profile) return { ok: false, error: "Not signed in." };
  if (profile.role !== "freelancer")
    return { ok: false, error: "Only freelancers can upgrade." };

  const membership = getMembership(profile);
  if (membership.isPro && membership.status === "active")
    return { ok: false, error: "You're already on the Pro plan." };

  const admin = createAdminClient();
  const now = new Date();
  const start = now.toISOString();
  const end = addDays(now, PERIOD_DAYS);

  if (method === "balance") {
    const earnings = await getFreelancerEarnings(
      supabase,
      user.id,
      asPlan(profile.plan)
    );
    if (earnings.available < MEMBERSHIP_PRICE) {
      return {
        ok: false,
        error: `Insufficient balance. You need $${MEMBERSHIP_PRICE.toFixed(
          2
        )} and have $${earnings.available.toFixed(2)}.`,
        available: earnings.available,
      };
    }

    // Log the payment (service role — ledger writes bypass RLS).
    const { error: payErr } = await admin.from("membership_payments").insert({
      user_id: user.id,
      amount: MEMBERSHIP_PRICE,
      currency: "usd",
      method: "balance",
      status: "paid",
      payment_date: start,
      billing_period_start: start,
      billing_period_end: end,
      note: "Pro membership — paid from balance",
    });
    if (payErr) return { ok: false, error: "Could not record the payment." };

    await activate(admin, user.id, "balance", start, end);
    await sendConfirmation(supabase, user.id, end);
    return { ok: true };
  }

  // Card / PayPal: charged via the payment gateway (Stripe / PayPal). The
  // gateway is wired via env keys — until those are set, these methods aren't
  // available and the freelancer can pay from balance instead. The real charge
  // is performed in chargeCardMembership()/chargePaypalMembership() below.
  if (method === "card") {
    if (!profile.stripe_payment_method_id || !profile.card_last4)
      return {
        ok: false,
        error: "No card on file. Add one in Settings → Billing.",
      };
    const res = await chargeCardMembership(profile);
    if (!res.ok)
      return { ok: false, error: res.error ?? "Card payment failed." };
    await admin.from("membership_payments").insert({
      user_id: user.id,
      amount: MEMBERSHIP_PRICE,
      currency: "usd",
      method: "card",
      status: "paid",
      payment_date: start,
      billing_period_start: start,
      billing_period_end: end,
      stripe_payment_intent_id: res.reference ?? null,
      note: "Pro membership — card",
    });
    await activate(admin, user.id, "card", start, end);
    await sendConfirmation(supabase, user.id, end);
    return { ok: true };
  }

  // PayPal
  if (!profile.paypal_billing_agreement_id || !profile.paypal_email)
    return {
      ok: false,
      error: "No PayPal connected. Connect it in Settings → Billing.",
    };
  const res = await chargePaypalMembership(profile);
  if (!res.ok) return { ok: false, error: res.error ?? "PayPal payment failed." };
  await admin.from("membership_payments").insert({
    user_id: user.id,
    amount: MEMBERSHIP_PRICE,
    currency: "usd",
    method: "paypal",
    status: "paid",
    payment_date: start,
    billing_period_start: start,
    billing_period_end: end,
    paypal_transaction_id: res.reference ?? null,
    note: "Pro membership — PayPal",
  });
  await activate(admin, user.id, "paypal", start, end);
  await sendConfirmation(supabase, user.id, end);
  return { ok: true };
}

// Charge helpers. These call the real gateway once its keys are configured;
// until then they report that the method isn't available yet (balance still
// works). Task: Stripe/PayPal wiring fills in the live charge path.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chargeCardMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _profile: any
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  if (!process.env.STRIPE_SECRET_KEY)
    return {
      ok: false,
      error:
        "Card payments aren't enabled yet. Pay from your Available Balance, or ask the admin to connect the payment gateway.",
    };
  const { chargeStripeMembership } = await import("@/lib/stripe");
  return chargeStripeMembership(_profile);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chargePaypalMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _profile: any
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  if (!process.env.PAYPAL_CLIENT_ID)
    return {
      ok: false,
      error:
        "PayPal isn't enabled yet. Pay from your Available Balance, or ask the admin to connect the payment gateway.",
    };
  const { chargePaypalMembership: charge } = await import("@/lib/paypal");
  return charge(_profile);
}

// Cancel: keep Pro access until the period ends, then downgrade. Auto-renew off.
export async function cancelMembership(): Promise<Result> {
  const { supabase, user, profile } = await authedProfile();
  if (!user || !profile) return { ok: false, error: "Not signed in." };
  const membership = getMembership(profile);
  if (!membership.isPro) return { ok: false, error: "You're not on Pro." };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ membership_status: "cancelled", membership_autorenew: false })
    .eq("id", user.id);

  // Cancel the recurring charge at the gateway (best-effort).
  if (profile.stripe_subscription_id) {
    try {
      const { cancelStripeSubscription } = await import("@/lib/stripe");
      await cancelStripeSubscription(profile.stripe_subscription_id);
    } catch {
      /* lazy downgrade still applies */
    }
  }
  if (profile.paypal_billing_agreement_id) {
    try {
      const { cancelPaypalAgreement } = await import("@/lib/paypal");
      await cancelPaypalAgreement(profile.paypal_billing_agreement_id);
    } catch {
      /* lazy downgrade still applies */
    }
  }

  await notify(
    supabase,
    user.id,
    "account",
    "Pro membership cancelled",
    `Your Pro membership won't renew. You keep Pro access until ${formatMembershipDate(
      membership.endDate
    )}, then you'll move to the Basic plan.`,
    "/settings/membership"
  );
  return { ok: true };
}

// Reactivate a cancelled-but-still-active membership (turn auto-renew back on).
export async function reactivateMembership(): Promise<Result> {
  const { supabase, user, profile } = await authedProfile();
  if (!user || !profile) return { ok: false, error: "Not signed in." };
  const membership = getMembership(profile);
  if (!(membership.plan === "pro" && membership.cancelled && membership.isPro))
    return { ok: false, error: "Nothing to reactivate." };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ membership_status: "active", membership_autorenew: true })
    .eq("id", user.id);

  await notify(
    supabase,
    user.id,
    "account",
    "Pro membership reactivated",
    "Your Pro membership will keep renewing. Thanks for staying with Xwork Pro!",
    "/settings/membership"
  );
  return { ok: true };
}

// --- helpers ---------------------------------------------------------------

async function activate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  method: string,
  start: string,
  end: string,
  extra: Record<string, unknown> = {}
) {
  await admin
    .from("profiles")
    .update({
      plan: "pro",
      membership_status: "active",
      membership_start_date: start,
      membership_end_date: end,
      membership_autorenew: true,
      last_payment_method: method,
      ...extra,
    })
    .eq("id", userId);
  // Account health: Pro membership is a +5 boost — recalc.
  try {
    const { recalcHealth } = await import("@/lib/health");
    await recalcHealth(userId, "membership_activated");
  } catch {
    /* best-effort */
  }
}

async function sendConfirmation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  end: string
) {
  await notify(
    supabase,
    userId,
    "account",
    "Welcome to Xwork Pro ⭐",
    `Your Pro membership is active. You now pay just 5% on job payments and have every Pro feature unlocked. Renews on ${formatMembershipDate(
      end
    )}.`,
    "/settings/membership"
  );
}
