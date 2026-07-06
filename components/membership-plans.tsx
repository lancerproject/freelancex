"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  upgradePro,
  cancelMembership,
  reactivateMembership,
} from "@/app/settings/membership/actions";

const PRICE = 20;

type Method = "balance" | "card" | "paypal";

type Props = {
  isPro: boolean;
  status: string;
  cancelled: boolean;
  endDate: string | null;
  renewsOn: string | null;
  available: number;
  hasCard: boolean;
  cardLabel: string | null;
  hasPaypal: boolean;
  paypalEmail: string | null;
};

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const BASIC_FEATURES = [
  { label: "Apply to jobs", on: true },
  { label: "Build your profile", on: true },
  { label: "Send proposals", on: true },
  { label: "Bid range visibility", on: false },
  { label: "Earnings breakdown", on: false },
  { label: "Personalized job alerts", on: false },
  { label: "Proposal insights", on: false },
  { label: "Custom profile URL", on: false },
  { label: "Always-active profile", on: false },
  { label: "Private earnings setting", on: false },
  { label: "50% off marketplace fee", on: false },
  { label: "Pro badge", on: false },
  { label: "Proposals shown at top", on: false },
];

const PRO_FEATURES = [
  "Everything in Basic",
  "See bid ranges on every job",
  "Full earnings breakdown",
  "Personalized job alerts (verified clients)",
  "Proposal insights & analytics",
  "Custom profile URL",
  "Always-active profile",
  "Hide earnings on your public profile",
  "5% marketplace fee (50% off)",
  "⭐ Pro badge everywhere",
  "Your proposals shown at the top",
];

export function MembershipPlans(props: Props) {
  const router = useRouter();
  const {
    isPro,
    status,
    cancelled,
    endDate,
    renewsOn,
    available,
    hasCard,
    cardLabel,
    hasPaypal,
    paypalEmail,
  } = props;

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [method, setMethod] = useState<Method>(
    available >= PRICE ? "balance" : hasCard ? "card" : hasPaypal ? "paypal" : "balance"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balanceEnough = available >= PRICE;
  const noMethod = !balanceEnough && !hasCard && !hasPaypal;

  async function doUpgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await upgradePro(method);
      if (res.ok) {
        setShowUpgrade(false);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await cancelMembership();
      if (res.ok) {
        setShowCancel(false);
        router.refresh();
      } else setError(res.error ?? "Something went wrong.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doReactivate() {
    setBusy(true);
    setError(null);
    try {
      const res = await reactivateMembership();
      if (res.ok) router.refresh();
      else setError(res.error ?? "Something went wrong.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* BASIC */}
        <div
          className={`rounded-2xl border bg-card p-6 ${
            isPro ? "border-border" : "border-primary ring-1 ring-primary/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Basic</h3>
            {!isPro && (
              <span className="text-xs font-semibold bg-primary/15 text-primary rounded-full px-3 py-1">
                Current plan
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            Free
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            10% marketplace fee on job payments
          </p>

          <ul className="mt-5 space-y-2 text-sm">
            {BASIC_FEATURES.map((f) => (
              <li
                key={f.label}
                className={`flex gap-2 ${
                  f.on ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span aria-hidden>{f.on ? "✓" : "🔒"}</span>
                {f.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled
            className="mt-6 w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground cursor-not-allowed"
          >
            {isPro ? "Downgrade at period end" : "Current Plan"}
          </button>
        </div>

        {/* PRO */}
        <div
          className={`rounded-2xl border bg-card p-6 relative ${
            isPro ? "border-primary ring-1 ring-primary/30" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              Pro
              <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200">
                ⭐ Pro
              </span>
            </h3>
            {isPro && (
              <span className="text-xs font-semibold bg-primary/15 text-primary rounded-full px-3 py-1">
                Current plan
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            $20<span className="text-base font-medium text-muted-foreground"> / month</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            5% marketplace fee on job payments{" "}
            <span className="text-primary font-medium">(50% off)</span>
          </p>

          <ul className="mt-5 space-y-2 text-sm text-foreground">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>

          {/* Button states */}
          <div className="mt-6">
            {!isPro && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowUpgrade(true);
                }}
                className="w-full rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90"
              >
                Upgrade to Pro
              </button>
            )}

            {isPro && !cancelled && (
              <>
                <button
                  type="button"
                  disabled
                  className="w-full rounded-full border border-primary/40 bg-primary/10 text-primary px-4 py-2.5 text-sm font-semibold cursor-default"
                >
                  Current Plan
                </button>
                {renewsOn && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Renews on {fmt(renewsOn)}
                  </p>
                )}
              </>
            )}

            {isPro && cancelled && (
              <>
                <button
                  type="button"
                  onClick={doReactivate}
                  disabled={busy}
                  className="w-full rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Working…" : "Reactivate Pro"}
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Pro access until {fmt(endDate)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Downgrade / cancel (Pro, not already cancelled) */}
      {isPro && !cancelled && (
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Cancel membership
            </p>
            <p className="text-sm text-muted-foreground">
              Downgrade anytime. You keep Pro access until{" "}
              {fmt(endDate)}, then move to Basic.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowCancel(true);
            }}
            className="shrink-0 rounded-full border border-destructive/40 text-destructive px-4 py-2 text-sm font-semibold hover:bg-destructive/10"
          >
            Cancel membership
          </button>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        Renews automatically every 30 days. Cancel anytime.
      </p>

      {/* FAQ */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-bold text-foreground mb-3">Frequently asked</h3>
        <div className="space-y-4 text-sm">
          <Faq
            q="What is the marketplace fee?"
            a="Basic members pay 10% on every job payment. Pro members pay only 5% — a 50% saving on everything you earn."
          />
          <Faq
            q="Can I pay from my Xwork earnings?"
            a="Yes. If you have $20+ in your Available Balance you can use it directly — no card or PayPal needed."
          />
          <Faq
            q="Can I cancel anytime?"
            a="Yes. Cancel before your next billing date and keep Pro access until the end of the current period."
          />
          <Faq
            q="What happens if my payment fails?"
            a="You get a 3-day grace period. If payment still fails, your account moves to the Basic plan."
          />
        </div>
      </div>

      {/* ---- Upgrade modal ---- */}
      {showUpgrade && (
        <Modal onClose={() => !busy && setShowUpgrade(false)}>
          <h3 className="text-lg font-bold text-foreground">Upgrade to Pro</h3>
          <p className="text-sm text-muted-foreground mt-1">
            $20.00 / month. Choose how to pay.
          </p>

          {noMethod ? (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="text-foreground font-medium">No payment method available</p>
              <p className="text-muted-foreground mt-1">
                You have {money(available)} in balance (need {money(PRICE)}). Add
                a card or PayPal in{" "}
                <Link href="/settings/billing" className="text-primary hover:underline">
                  Settings → Billing
                </Link>
                , or earn more to pay from balance.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <MethodOption
                selected={method === "balance"}
                disabled={!balanceEnough}
                onSelect={() => setMethod("balance")}
                title={`Pay from Available Balance`}
                sub={
                  balanceEnough
                    ? `${money(available)} available · ${money(
                        available - PRICE
                      )} remaining after payment`
                    : `Insufficient — ${money(available)} available, need ${money(
                        PRICE
                      )}`
                }
              />
              {hasCard && (
                <MethodOption
                  selected={method === "card"}
                  onSelect={() => setMethod("card")}
                  title={`Pay with Card`}
                  sub={cardLabel ?? "Saved card"}
                />
              )}
              {hasPaypal && (
                <MethodOption
                  selected={method === "paypal"}
                  onSelect={() => setMethod("paypal")}
                  title="Pay with PayPal"
                  sub={paypalEmail ?? "Connected PayPal"}
                />
              )}
            </div>
          )}

          {method === "balance" && balanceEnough && (
            <p className="text-xs text-muted-foreground mt-3">
              {money(PRICE)} will be deducted from your Available Balance (
              {money(available)}). Remaining: {money(available - PRICE)}. Pro
              activates immediately.
            </p>
          )}

          {error && <p className="text-sm text-destructive mt-3">{error}</p>}

          <div className="mt-5 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowUpgrade(false)}
              disabled={busy}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doUpgrade}
              disabled={busy || noMethod}
              className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Processing…" : "Confirm Payment"}
            </button>
          </div>
        </Modal>
      )}

      {/* ---- Cancel modal ---- */}
      {showCancel && (
        <Modal onClose={() => !busy && setShowCancel(false)}>
          <h3 className="text-lg font-bold text-foreground">Cancel membership?</h3>
          <p className="text-sm text-muted-foreground mt-2">
            You&apos;ll keep Pro access until {fmt(endDate)}. After that you move
            to the Basic plan (10% marketplace fee, Pro features locked).
          </p>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <div className="mt-5 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowCancel(false)}
              disabled={busy}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
            >
              Keep Pro
            </button>
            <button
              type="button"
              onClick={doCancel}
              disabled={busy}
              className="rounded-full bg-destructive text-white px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Cancelling…" : "Cancel membership"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-medium text-foreground">{q}</p>
      <p className="text-muted-foreground mt-1">{a}</p>
    </div>
  );
}

function MethodOption({
  selected,
  disabled,
  onSelect,
  title,
  sub,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-xl border p-3 flex items-start gap-3 transition ${
        selected
          ? "border-primary ring-1 ring-primary/30 bg-primary/5"
          : "border-border hover:bg-secondary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
          selected ? "border-primary" : "border-muted-foreground"
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
