"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePasswordGate } from "@/components/password-confirm-modal";
import { requestWithdrawal } from "@/app/withdraw/actions";

// "Withdraw now" — pick a method, choose the full balance or another amount,
// confirm with the account password, then see a withdrawal receipt. New methods
// can't be used until their 3-day security period ends. The server action
// (requestWithdrawal) re-checks the balance, fee and password server-side.

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
const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

type Receipt = {
  label: string;
  amount: number;
  fee: number;
  total: number;
  expected: string;
};

export function WithdrawNow({
  available,
  methods,
}: {
  available: number;
  methods: Method[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const usable = useMemo(() => methods.filter((m) => !isActivating(m)), [methods]);
  const preferred = usable.find((m) => m.is_default) ?? usable[0];
  const [methodId, setMethodId] = useState(preferred?.id ?? "");
  const [mode, setMode] = useState<"full" | "other">("full");
  const [amount, setAmount] = useState(available.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { require: requirePassword, modal: passwordModal } = usePasswordGate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !receipt) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receipt]);

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
  const amt = mode === "full" ? available : Number(amount);
  const fee = selected ? feeFor(selected.type) : 0;
  const total = Number.isFinite(amt) ? Math.max(0, amt - fee) : 0;

  const reset = () => {
    setErr(null);
    setMode("full");
    setAmount(available.toFixed(2));
    setMethodId(preferred?.id ?? "");
  };

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
    // Money leaves the account — confirm it's really the owner (password gate).
    if (!(await requirePassword())) return;
    setBusy(true);
    const res = await requestWithdrawal(selected.id, amt).catch(() => ({
      ok: false,
      error: "Something went wrong. Please try again.",
    }));
    setBusy(false);
    if (res.ok) {
      const expected = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(
        undefined,
        { year: "numeric", month: "short", day: "numeric" }
      );
      setReceipt({ label: selected.label, amount: amt, fee, total, expected });
      router.refresh(); // update balance/history behind the modal
    } else {
      setErr(res.error || "Couldn't process the withdrawal.");
    }
  };

  const close = () => {
    setOpen(false);
    setReceipt(null);
    reset();
  };

  const row = "flex items-center justify-between gap-4 py-3 border-b border-border";

  return (
    <>
      <button
        type="button"
        disabled={!canOpen}
        title={title}
        onClick={() => {
          reset();
          setReceipt(null);
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
          onClick={() => !receipt && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-md w-full p-6 max-h-[90vh] overflow-y-auto print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            {receipt ? (
              /* -------- Withdrawal details receipt -------- */
              <div id="withdraw-receipt">
                {/* Print only the receipt, on a clean white page — not the
                    dark modal/overlay/nav behind it. Scoped: this <style> is in
                    the DOM only while the receipt is open, so printing other
                    pages is unaffected. */}
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #withdraw-receipt, #withdraw-receipt * { visibility: visible !important; color:#111 !important; }
                    #withdraw-receipt { position: fixed !important; inset: 0 !important; margin:0 !important; padding: 40px !important; background:#fff !important; border:0 !important; box-shadow:none !important; max-width:none !important; overflow:visible !important; }
                    #withdraw-receipt .no-print { display:none !important; }
                  }
                `}</style>
                <div className="hidden print:block mb-4">
                  <span className="text-xl font-extrabold">
                    <span style={{ color: "#6d28d9" }}>X</span>work
                  </span>
                  <p style={{ color: "#555", fontSize: "12px", marginTop: "2px" }}>
                    Withdrawal receipt
                  </p>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Withdrawal details
                </h2>
                <div className="mt-5 text-sm">
                  <div className={row}>
                    <span className="text-muted-foreground">Withdrawal method</span>
                    <span className="text-foreground font-medium text-right">
                      {receipt.label}
                    </span>
                  </div>
                  <div className={row}>
                    <span className="text-muted-foreground">Withdrawal amount</span>
                    <span className="text-foreground font-medium">
                      {money(receipt.amount)}
                    </span>
                  </div>
                  <div className={row}>
                    <span className="text-muted-foreground">Withdrawal fee</span>
                    <span className="text-foreground font-medium">
                      -{money(receipt.fee)}
                    </span>
                  </div>
                  <div className={row}>
                    <span className="text-muted-foreground">Total amount</span>
                    <span className="text-foreground font-bold">
                      {money(receipt.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-muted-foreground">Expected</span>
                    <span className="text-foreground font-medium">
                      {receipt.expected}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-6 no-print">
                  <button
                    type="button"
                    onClick={close}
                    className="text-foreground font-medium hover:underline"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-semibold hover:opacity-90"
                  >
                    Print
                  </button>
                </div>
              </div>
            ) : (
              /* -------- Withdraw now form -------- */
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-bold text-foreground">Withdraw now</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground text-xl"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs font-medium text-muted-foreground mt-4">
                  Available balance
                </p>
                <p className="text-2xl font-bold text-primary">
                  {money(available)}
                </p>

                <div className="mt-4">
                  <label className="text-xs font-medium text-muted-foreground">
                    Withdrawal method
                  </label>
                  <select
                    value={selected?.id ?? ""}
                    onChange={(e) => setMethodId(e.target.value)}
                    className="mt-1 w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {usable.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                        {m.is_default ? " (Preferred)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-primary/10 text-primary p-3 text-sm">
                    <span aria-hidden>ℹ️</span>
                    <span>This method can take up to 24 hours to reach your account.</span>
                  </div>
                </div>

                {/* Amount — full balance or a custom amount */}
                <fieldset className="mt-4">
                  <legend className="text-xs font-medium text-muted-foreground mb-1">
                    Amount
                  </legend>
                  <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="wd-amount"
                      checked={mode === "full"}
                      onChange={() => {
                        setMode("full");
                        setErr(null);
                      }}
                    />
                    <span className="text-sm text-foreground">
                      {money(available)}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="wd-amount"
                      checked={mode === "other"}
                      onChange={() => {
                        setMode("other");
                        setErr(null);
                      }}
                    />
                    <span className="text-sm text-foreground">Other amount</span>
                  </label>
                  {mode === "other" && (
                    <div className="flex items-center gap-2 mt-1 ml-6">
                      <input
                        type="number"
                        min="5"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-40 bg-background border border-border text-foreground rounded-lg p-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-sm text-muted-foreground">USD</span>
                    </div>
                  )}
                </fieldset>

                {/* Fee + total */}
                <div className="mt-4 border-t border-border pt-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-foreground">Withdrawal fee (per payout)</p>
                      <p className="text-xs text-muted-foreground">
                        Additional provider fees may apply.
                      </p>
                    </div>
                    <span className="text-foreground">-{money(fee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-3">
                    <span className="text-lg font-bold text-foreground">
                      Total amount
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {money(total)}
                    </span>
                  </div>
                </div>

                {selected && Number.isFinite(amt) && amt >= 5 && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/10 text-primary p-3 text-sm">
                    <span aria-hidden>💲</span>
                    <span>
                      You are about to send {money(total)} to your {selected.label}.
                    </span>
                  </div>
                )}

                {err && <p className="text-sm text-red-500 mt-3">{err}</p>}

                <div className="flex items-center gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-foreground font-medium hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={confirm}
                    className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "Processing…" : "Withdraw now"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  You&apos;ll be asked for your Xwork password to confirm — money
                  never leaves your account without it.
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
