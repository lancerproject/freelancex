import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  PERIOD_DAYS,
  addDays,
  MEMBERSHIP_PRICE,
  formatMembershipDate,
} from "@/lib/membership";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";

// Stripe webhook. Handles invoice.paid, invoice.payment_failed and
// customer.subscription.deleted. Signature is verified manually (HMAC-SHA256)
// so we don't need the Stripe SDK. Configure the endpoint + signing secret in
// the Stripe dashboard and set STRIPE_WEBHOOK_SECRET.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";
  if (!verify(raw, sig, secret))
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const obj = (event.data?.object ?? {}) as Record<string, unknown>;
  const customerId = (obj.customer as string) ?? null;

  async function profileByCustomer() {
    if (!customerId) return null;
    const { data } = await admin
      .from("profiles")
      .select("id, membership_end_date")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data;
  }

  try {
    if (event.type === "invoice.paid") {
      const p = await profileByCustomer();
      if (p) {
        const start = new Date().toISOString();
        const end = addDays(new Date(), PERIOD_DAYS);
        await admin.from("membership_payments").insert({
          user_id: p.id,
          amount: MEMBERSHIP_PRICE,
          currency: "usd",
          method: "card",
          status: "paid",
          payment_date: start,
          billing_period_start: start,
          billing_period_end: end,
          stripe_payment_intent_id: (obj.payment_intent as string) ?? null,
          note: "Pro membership — Stripe invoice.paid",
        });
        await admin
          .from("profiles")
          .update({
            plan: "pro",
            membership_status: "active",
            membership_end_date: end,
            last_payment_method: "card",
          })
          .eq("id", p.id);
        await notify(
          admin,
          p.id,
          "account",
          "Pro membership renewed",
          `Your card was charged and Pro renewed. Next renewal: ${formatMembershipDate(
            end
          )}.`,
          "/settings/membership"
        );
      }
    } else if (event.type === "invoice.payment_failed") {
      const p = await profileByCustomer();
      if (p) {
        await admin
          .from("profiles")
          .update({ membership_status: "past_due" })
          .eq("id", p.id);
        await admin.from("membership_payments").insert({
          user_id: p.id,
          amount: MEMBERSHIP_PRICE,
          currency: "usd",
          method: "card",
          status: "failed",
          payment_date: new Date().toISOString(),
          note: "Stripe invoice.payment_failed",
        });
        await notify(
          admin,
          p.id,
          "account",
          "Pro payment failed",
          "Your card payment failed. We'll retry during a 3-day grace period — update your card in Settings → Billing to keep Pro.",
          "/settings/billing"
        );
      }
    } else if (event.type === "customer.subscription.deleted") {
      const p = await profileByCustomer();
      if (p) {
        await admin
          .from("profiles")
          .update({
            plan: "basic",
            membership_status: "expired",
            custom_slug_active: false,
          })
          .eq("id", p.id);
        await notify(
          admin,
          p.id,
          "account",
          "Your Pro membership has ended",
          "Your subscription was cancelled and you're back on the Basic plan.",
          "/settings/membership"
        );
      }
    }
  } catch (e) {
    console.error("stripe webhook handler error:", e);
    // Still 200 so Stripe doesn't hammer retries for a non-signature issue.
  }

  return NextResponse.json({ received: true });
}

// Verify Stripe's `t=...,v1=...` signature header against the raw body.
function verify(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${payload}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(v1, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}
