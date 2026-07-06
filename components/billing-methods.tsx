"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { removeCard, removePayPal } from "@/app/settings/billing/actions";

type Props = {
  hasCard: boolean;
  cardLabel: string | null;
  hasPaypal: boolean;
  paypalEmail: string | null;
  stripeReady: boolean;
  paypalReady: boolean;
};

// Settings → Billing for freelancers. Exactly two methods: Card and PayPal,
// used to pay for Pro membership. Balance is always available on the membership
// page and needs no setup here.
export function BillingMethods({
  hasCard,
  cardLabel,
  hasPaypal,
  paypalEmail,
  stripeReady,
  paypalReady,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(kind: "card" | "paypal") {
    setBusy(kind);
    try {
      const res = kind === "card" ? await removeCard() : await removePayPal();
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Credit / Debit card
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Used to pay for your Pro membership. One card at a time.
            </p>
          </div>
          <span className="text-2xl" aria-hidden>💳</span>
        </div>

        {hasCard ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-4">
            <p className="text-sm font-medium text-foreground">{cardLabel}</p>
            <button
              type="button"
              onClick={() => remove("card")}
              disabled={busy === "card"}
              className="text-sm font-medium text-destructive hover:underline disabled:opacity-60"
            >
              {busy === "card" ? "Removing…" : "Remove"}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4">
            {stripeReady ? (
              <p className="text-sm text-muted-foreground">
                Secure card entry (Stripe) is enabled. Use “Add card” on your
                next Pro payment to save one.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Card payments aren&apos;t connected yet. You can still upgrade to
                Pro by paying from your{" "}
                <Link href="/settings/membership" className="text-primary hover:underline">
                  Available Balance
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </div>

      {/* PayPal */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">PayPal</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a PayPal account to pay for Pro. One account at a time.
            </p>
          </div>
          <span className="text-2xl" aria-hidden>🅿️</span>
        </div>

        {hasPaypal ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-4">
            <p className="text-sm font-medium text-foreground">{paypalEmail}</p>
            <button
              type="button"
              onClick={() => remove("paypal")}
              disabled={busy === "paypal"}
              className="text-sm font-medium text-destructive hover:underline disabled:opacity-60"
            >
              {busy === "paypal" ? "Removing…" : "Remove"}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4">
            {paypalReady ? (
              <p className="text-sm text-muted-foreground">
                PayPal is enabled. Use “Connect PayPal” on your next Pro payment.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                PayPal isn&apos;t connected yet. You can still upgrade to Pro by
                paying from your{" "}
                <Link href="/settings/membership" className="text-primary hover:underline">
                  Available Balance
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Xwork never stores your raw card number — cards are handled securely by
        Stripe. These methods are only used for your $20/month Pro membership.
      </p>
    </div>
  );
}
