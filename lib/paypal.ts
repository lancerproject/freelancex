// PayPal integration — server side, via the REST API over fetch (no SDK).
// No-ops safely when PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET aren't set, so the
// app runs fully without a gateway (balance payments work).

import { MEMBERSHIP_PRICE } from "./membership";

export function paypalEnabled(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function baseUrl(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("paypal_not_configured");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description || "PayPal auth failed.");
  return json.access_token as string;
}

// Charge the connected PayPal billing agreement for one month of Pro.
export async function chargePaypalMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
): Promise<{ ok: boolean; error?: string; reference?: string }> {
  try {
    const agreementId = profile?.paypal_billing_agreement_id;
    if (!agreementId) return { ok: false, error: "No PayPal agreement." };
    const token = await accessToken();
    // Billing Agreements API: charge the agreed amount.
    const res = await fetch(
      `${baseUrl()}/v1/payments/billing-agreements/${agreementId}/agreement-transactions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: { currency: "USD", value: MEMBERSHIP_PRICE.toFixed(2) },
          note: "Xwork Pro membership",
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    const json = await res.json();
    if (!res.ok)
      return { ok: false, error: json?.message || "PayPal charge failed." };
    return { ok: true, reference: json?.transaction_id ?? json?.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "PayPal charge failed.",
    };
  }
}

// Cancel the recurring billing agreement.
export async function cancelPaypalAgreement(agreementId: string) {
  try {
    const token = await accessToken();
    await fetch(
      `${baseUrl()}/v1/payments/billing-agreements/${agreementId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: "Cancelled from Xwork" }),
        signal: AbortSignal.timeout(15000),
      }
    );
  } catch {
    /* best effort */
  }
}
