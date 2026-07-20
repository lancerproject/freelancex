"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notify } from "@/lib/notify";
import { loadOwnProfile } from "@/lib/own-profile";

type Result = { ok: boolean; error?: string };

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Save a card. The card is tokenised client-side with Stripe Elements — we only
// ever receive a PaymentMethod id (never raw card data). Requires the gateway.
export async function saveCard(paymentMethodId: string): Promise<Result> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!process.env.STRIPE_SECRET_KEY)
    return {
      ok: false,
      error: "Card payments aren't enabled yet. Ask the admin to connect Stripe.",
    };
  if (!paymentMethodId) return { ok: false, error: "Missing card token." };

  try {
    const { ensureStripeCustomer, attachCard } = await import("@/lib/stripe");
    const profile = await loadOwnProfile(user.id);
    const customerId = await ensureStripeCustomer(
      profile?.email ?? user.email ?? "",
      profile?.stripe_customer_id
    );
    const { brand, last4 } = await attachCard(customerId, paymentMethodId);

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
        card_brand: brand,
        card_last4: last4,
      })
      .eq("id", user.id);
    await notify(
      supabase,
      user.id,
      "account",
      "Card saved",
      `A ${brand} card ending ${last4} was added to your account.`,
      "/settings/billing"
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save card." };
  }
}

export async function removeCard(): Promise<Result> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      stripe_payment_method_id: null,
      card_brand: null,
      card_last4: null,
    })
    .eq("id", user.id);
  await notify(
    supabase,
    user.id,
    "account",
    "Card removed",
    "Your saved card was removed from your account.",
    "/settings/billing"
  );
  return { ok: true };
}

// Store a connected PayPal (email + billing agreement id) after the PayPal flow.
export async function connectPayPal(
  email: string,
  billingAgreementId: string
): Promise<Result> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!process.env.PAYPAL_CLIENT_ID)
    return {
      ok: false,
      error: "PayPal isn't enabled yet. Ask the admin to connect PayPal.",
    };
  if (!email || !billingAgreementId)
    return { ok: false, error: "Missing PayPal details." };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      paypal_email: email,
      paypal_billing_agreement_id: billingAgreementId,
    })
    .eq("id", user.id);
  await notify(
    supabase,
    user.id,
    "account",
    "PayPal connected",
    `Your PayPal account (${email}) was connected.`,
    "/settings/billing"
  );
  return { ok: true };
}

export async function removePayPal(): Promise<Result> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ paypal_email: null, paypal_billing_agreement_id: null })
    .eq("id", user.id);
  await notify(
    supabase,
    user.id,
    "account",
    "PayPal removed",
    "Your PayPal account was disconnected.",
    "/settings/billing"
  );
  return { ok: true };
}
