"use client";

import { useState, useTransition } from "react";
import { saveRate } from "@/app/create-profile/actions";

const FEE = 0.1; // 10% Xwork service fee
const MAX_RATE = 999; // highest hourly rate a freelancer can set

// Defined at module scope (NOT inside RateStep) so it keeps a stable identity
// across renders — otherwise React remounts the input on every keystroke and
// the field loses focus after each character.
function Row({
  title,
  desc,
  children,
}: {
  title: React.ReactNode;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-7 border-b border-neutral-200">
      <div className="max-w-xl">
        <h3 className="text-2xl font-semibold text-neutral-900">{title}</h3>
        <p className="text-neutral-600 mt-2">{desc}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">{children}</div>
    </div>
  );
}

export function RateStep({ initialRate = "" }: { initialRate?: string }) {
  const [rate, setRate] = useState(initialRate);
  const [showError, setShowError] = useState(false);
  const [overMax, setOverMax] = useState(false);
  const [showFee, setShowFee] = useState(false);
  const [pending, startTransition] = useTransition();

  const num = parseFloat(rate) || 0;
  const fee = num * FEE;
  const youGet = num - fee;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const onRateChange = (raw: string) => {
    setShowError(false);
    // keep digits and a single decimal point only
    let v = raw.replace(/[^0-9.]/g, "");
    const n = parseFloat(v);
    if (!isNaN(n) && n > MAX_RATE) {
      v = String(MAX_RATE); // clamp to the maximum
      setOverMax(true);
    } else {
      setOverMax(false);
    }
    setRate(v);
  };

  const submit = () => {
    if (num <= 0) {
      setShowError(true);
      return;
    }
    const fd = new FormData();
    fd.set("hourly_rate", String(num));
    startTransition(() => saveRate(fd));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        Now, let&apos;s set your hourly rate.
      </h1>
      <p className="text-neutral-600 mt-3 max-w-3xl">
        Clients will see this rate on your profile and in search results once
        you publish your profile. You can adjust your rate every time you submit
        a proposal.
      </p>

      <div className="mt-8">
        <Row title="Hourly rate" desc="Total amount the client will see.">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                $
              </span>
              <input
                value={rate}
                inputMode="decimal"
                onChange={(e) => onRateChange(e.target.value)}
                placeholder="0.00"
                className="w-40 rounded-full border border-neutral-300 pl-7 pr-4 py-3 text-right outline-none focus:border-primary"
              />
            </div>
            <span className="text-neutral-500">/hr</span>
          </div>
          <span className="text-xs text-neutral-400">Max $999/hr</span>
        </Row>

        <Row
          title={
            <span className="flex items-center gap-3">
              Service fee
              <button
                type="button"
                onClick={() => setShowFee(true)}
                className="text-base font-normal underline text-primary hover:opacity-80"
              >
                Learn more
              </button>
            </span>
          }
          desc="This helps us run Xwork and provide services like payment protection and customer support. The Xwork service fee is 10%."
        >
          <div className="flex items-center gap-2">
            <div className="w-40 rounded-full px-4 py-3 text-right bg-neutral-100 text-neutral-500">
              {fmt(fee)}
            </div>
            <span className="text-neutral-500">/hr</span>
          </div>
        </Row>

        <Row
          title="You'll get"
          desc="The estimated amount you'll receive after the service fee."
        >
          <div className="flex items-center gap-2">
            <div className="w-40 rounded-full px-4 py-3 text-right border border-neutral-300 text-neutral-900">
              {fmt(youGet)}
            </div>
            <span className="text-neutral-500">/hr</span>
          </div>
        </Row>
      </div>

      {overMax && (
        <p className="mt-4 text-sm text-amber-600 flex items-center gap-1.5">
          <span>⚠</span> The maximum hourly rate is $999/hr.
        </p>
      )}
      {showError && (
        <p className="mt-4 text-sm text-red-600 flex items-center gap-1.5">
          <span>⚠</span> Please enter an hourly rate greater than $0.
        </p>
      )}

      {/* footer */}
      <div className="flex items-center justify-between mt-12">
        <a
          href="/create-profile/overview"
          className="px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
        >
          Back
        </a>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Next, add your photo and location"}
        </button>
      </div>

      {/* Service fee explanation */}
      {showFee && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowFee(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-neutral-900">
                About the Xwork service fee
              </h2>
              <button
                type="button"
                onClick={() => setShowFee(false)}
                aria-label="Close"
                className="text-neutral-500 hover:text-neutral-900 text-xl shrink-0"
              >
                ✕
              </button>
            </div>

            <p className="text-neutral-600 mt-3">
              Xwork keeps a flat <span className="font-semibold">10%</span> of
              what you earn on every contract. There are no sign-up costs, no
              monthly charges and no fee to apply for jobs — we only earn when
              you do.
            </p>

            <h3 className="font-semibold text-neutral-900 mt-5">
              What your fee pays for
            </h3>
            <ul className="mt-2 space-y-2.5 text-neutral-700">
              <li className="flex gap-2.5">
                <span className="text-primary mt-0.5">🔒</span>
                <span>
                  <span className="font-medium">Payment protection.</span> Funds
                  are secured in escrow before you start and released to you once
                  your work is approved — so you always know you&apos;ll get paid.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary mt-0.5">💬</span>
                <span>
                  <span className="font-medium">24/7 customer support.</span> A
                  real team to help with payments, accounts and any issue that
                  comes up.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary mt-0.5">⚖️</span>
                <span>
                  <span className="font-medium">Dispute resolution.</span> If
                  something goes wrong with a client, our mediation team helps
                  resolve it fairly.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary mt-0.5">🛡️</span>
                <span>
                  <span className="font-medium">Fraud &amp; security.</span> We
                  screen clients and monitor payments to keep the marketplace
                  safe.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-primary mt-0.5">🚀</span>
                <span>
                  <span className="font-medium">The platform itself.</span> Job
                  matching, search, messaging, invoicing and the tools that bring
                  clients to you.
                </span>
              </li>
            </ul>

            <h3 className="font-semibold text-neutral-900 mt-5">
              How it&apos;s calculated
            </h3>
            <p className="text-neutral-600 mt-2">
              The 10% is taken from the amount the client pays — your rate stays
              the headline number clients see. For example, at{" "}
              <span className="font-semibold">$100/hr</span>: a{" "}
              <span className="font-semibold">$10</span> service fee is deducted
              and you receive <span className="font-semibold">$90/hr</span>.
            </p>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowFee(false)}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
