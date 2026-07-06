"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePasswordGate } from "@/components/password-confirm-modal";
import { requestWithdrawal } from "@/app/withdraw/actions";

// "Withdraw now" — pick a method, choose an amount, confirm with the account
// password, done. New methods can't be used until their 3-day security
// period ends.

type Method = {
  id: string;
  type: string;
  label: string;
  is_default: boolean;
  active_at?: string | null;
};

function feeFor(type: string): number {
  return type === "payoneer" ? 2 : 0.99;
}

function isActivating(m: Method): boolean {
  return !!m.active_at && new Date(m.active_at).getTime() > Date.now();
}

export function WithdrawNow({
  available,
  methods,
}: {
  available: number;
  methods: Method[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const usable = useMemo(() => methods.filter((m) => !isActivating(m)), [methods]);
  const preferred = usable.find((m) => m.is_default) ?? usable[0];
  const [methodId, setMethodId] = useState(preferred?.id ?? "");
  const [amount, setAmount] = useState(available.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { require: requirePassword, modal: passwordModal } = usePasswordGate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canOpen = available >= 5 && usable.length > 0;
  const title =
    available < 5
      ? "You need at least $5.00 of available balance to withdraw"
      : usable.length === 0
        ? methods.length === 0
          ? "Add a withdrawal method first"
          : "Your withdrawal method is still in its 3-day security period"
        : "Withdraw your available balance";

  const selected = usable.find((m) => m.id === methodId) ?? preferred;
  const amt = Number(amount);
  const fee = selected ? feeFor(selected.type) : 0;
  const receive = Number.isFinite(amt) ? Math.max(0, amt - fee) : 0;
  const money = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const confirm = async () => {
    if (busy || !selected) return;
    setErr(null);
    if (!Number.isFinite(amt) || amt < 5) {
      setErr("The minimum withdrawal is $5.00.");
      return;
    }
    if (amt > available) {
      setErr("That's more than your available balance.");
      return;
    }
    // Money leaves the account — confirm it's really the owner.
    if (!(await requirePassword())) return;
    setBusy(true);
    const res = await requestWithdrawal(selected.id, amt).catch(() => ({
      ok: false,
      error: "Something went wrong. Please try again.",
    }));
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        router.refresh();
      }, 1800);
    } else {
      setErr(res.error || "Couldn't process the withdrawal.");
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={!canOpen}
        title={title}
        onClick={() => {
          setErr(null);
          setAmount(available.toFixed(2));
          setMethodId(preferred?.id ?? "");
          setOpen(true);
        }}
        className={`px-6 py-2.5 rounded-full font-semibold transition ${
          canOpen
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
        }`}
      >
        Withdraw now
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center py-8">
                <div className="text-5xl">✅</div>
                <p className="font-semibold text-foreground mt-4">
                  Withdrawal processed
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  It will appear in your account shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-foreground">
                    Withdraw funds
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground text-xl"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Available balance:{" "}
                  <span className="font-semibold text-foreground">
                    {money(available)}
                  </span>
                </p>

                <div className="space-y-4 mt-5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Withdrawal method
                    </label>
                    <select
                      value={selected?.id ?? ""}
                      onChange={(e) => setMethodId(e.target.value)}
                      className="w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {usable.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                          {m.is_default ? " (Preferred)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Amount (USD)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="5"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(available.toFixed(2))}
                        className="border border-border text-foreground rounded-lg px-3 text-sm hover:bg-secondary"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Withdrawal amount</span>
                      <span>{Number.isFinite(amt) ? money(amt) : "—"}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Provider fee</span>
                      <span>-{money(fee)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                      <span>You&apos;ll receive</span>
                      <span>{money(receive)}</span>
                    </div>
                  </div>
                </div>

                {err && <p className="text-sm text-red-500 mt-3">{err}</p>}

                <button
                  type="button"
                  disabled={busy}
                  onClick={confirm}
                  className="w-full mt-5 bg-primary text-primary-foreground rounded-full py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Processing…" : "Confirm withdrawal"}
                </button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  You&apos;ll be asked for your Xwork password to confirm.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {passwordModal}
    </>
  );
}
