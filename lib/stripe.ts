// Stripe integration — server side, via the REST API over fetch (no SDK
// dependency). Every function no-ops/deferring safely when STRIPE_SECRET_KEY
// isn't set, so the app runs fully without a gateway (balance payments work).
//
// We never store raw card data — the card is tokenised client-side with Stripe
// Elements and only the PaymentMethod id + brand/last4 are saved.

import { MEMBERSHIP_PRICE } from "./membership";

const API = "https://api.stripe.com/v1";

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function form(obj: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.append(k, String(v));
  return p.toString();
}

async function stripeFetch(
  path: string,
  method: "GET" | "POST" | "DELETE",
  body?: Record<string, string | number | undefined>
) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? form(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || "Stripe request failed.";
    throw new Error(msg);
  }
  return json;
}

// Ensure the freelancer has a Stripe customer; returns the customer id.
export async function ensureStripeCustomer(
  email: string,
  existingId?: string | null
): Promise<string> {
  if (existingId) return existingId;
  const cust = await stripeFetch("/customers", "POST", { email });
  return cust.id as string;
}

// Attach a tokenised PaymentMethod to the customer and read its brand/last4.
export async function attachCard(
  customerId: string,
  paymentMethodId: string
): Promise<{ brand: string; last4: string }> {
  await stripeFetch(`/payment_methods/${paymentMethodId}/attach`, "POST", {
    customer: customerId,
  });
  const pm = await stripeFetch(`/payment_methods/${paymentMethodId}`, "GET");
  return {
    brand: pm?.card?.brand ?? "card",
    last4: pm?.card?.last4 ?? "0000",
  };
}

// Charge the saved card off-session for one month of Pro.
export async function chargeStripeMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  try {
    if (!profile?.stripe_customer_id || !profile?.stripe_payment_method_id)
      return { ok: false, error: "No saved card." };
    const pi = await stripeFetch("/payment_intents", "POST", {
      amount: Math.round(MEMBERSHIP_PRICE * 100),
      currency: "usd",
      customer: profile.stripe_customer_id,
      payment_method: profile.stripe_payment_method_id,
      off_session: "true",
      confirm: "true",
      description: "Xwork Pro membership",
    });
    if (pi.status !== "succeeded")
      return { ok: false, error: `Card ${pi.status}.`, reference: pi.id };
    return { ok: true, reference: pi.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Card charge failed." };
  }
}

// We charge monthly via the renewal cron rather than a Stripe subscription, so
// there is usually nothing to cancel; kept for when a subscription id exists.
export async function cancelStripeSubscription(subscriptionId: string) {
  try {
    await stripeFetch(`/subscriptions/${subscriptionId}`, "DELETE");
  } catch {
    /* best effort */
  }
}
