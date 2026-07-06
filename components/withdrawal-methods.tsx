"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePasswordGate } from "@/components/password-confirm-modal";
import { COUNTRIES } from "@/lib/countries";
import {
  connectPayoneer,
  addBankMethod,
  removePayoutMethod,
  makeDefaultPayoutMethod,
} from "@/app/withdraw/actions";

// Upwork-style withdrawal methods (freelancer side):
//   Add a method → modal with "Recommended for {country}" (Local Bank,
//   Payoneer) + "Also Available" (Wire, U.S. Bank).
//   Payoneer → "You are about to leave Xwork" → create/connect choice →
//   Payoneer-style email step → verified → back on Xwork with the card added.
//   Remove → confirm modal → ACCOUNT PASSWORD → removed (can re-add anytime).
// New methods show an "Activating" chip until their 3-day security period ends.

export type PayoutMethod = {
  id: string;
  type: string;
  label: string;
  details: string | null;
  is_default: boolean;
  active_at?: string | null;
  created_at: string;
};

function methodIcon(type: string): string {
  if (type === "payoneer") return "🟠";
  if (type === "paypal") return "🅿️";
  return "🏦";
}

function isActivating(m: PayoutMethod): boolean {
  return !!m.active_at && new Date(m.active_at).getTime() > Date.now();
}

// Fixed "Jul 8" format — locale-dependent formatting renders differently on
// the server and in the browser and breaks hydration.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function activatesOn(m: PayoutMethod): string {
  if (!m.active_at) return "";
  const d = new Date(m.active_at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function WithdrawalMethods({
  methods,
  country,
  verifyRequired,
}: {
  methods: PayoutMethod[];
  country: string | null;
  verifyRequired: boolean;
}) {
  const router = useRouter();
  // Modal steps: picker → bank form / payoneer leave → choice → login → done
  const [step, setStep] = useState<
    | null
    | "picker"
    | "bank"
    | "leave"
    | "choice"
    | "login"
    | "verifying"
    | "connected"
  >(null);
  const [holder, setHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCountry, setBankCountry] = useState(country ?? "");
  const [swift, setSwift] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [payoneerEmail, setPayoneerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const { require: requirePassword, modal: passwordModal } = usePasswordGate();

  // Escape closes whatever is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStep(null);
        setRemoving(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setStep(null);
    setErr(null);
    setBusy(false);
  };

  const saveBank = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    const res = await addBankMethod({
      holder,
      bankName,
      country: bankCountry,
      swift,
      accountNumber,
    }).catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (res.ok) {
      close();
      setHolder("");
      setBankName("");
      setSwift("");
      setAccountNumber("");
      router.refresh();
    } else {
      setErr(res.error || "Couldn't save the method.");
    }
  };

  const connect = async () => {
    if (busy) return;
    setErr(null);
    setStep("verifying");
    setBusy(true);
    // Brief verification pause — mirrors the provider handshake.
    await new Promise((r) => setTimeout(r, 1400));
    const res = await connectPayoneer(payoneerEmail).catch(() => ({
      ok: false,
      error: "Something went wrong.",
    }));
    setBusy(false);
    if (res.ok) {
      setStep("connected");
      setTimeout(() => {
        close();
        setPayoneerEmail("");
        router.refresh();
      }, 1600);
    } else {
      setStep("login");
      setErr(res.error || "Couldn't connect your Payoneer account.");
    }
  };

  const confirmRemove = async () => {
    if (!removing || busy) return;
    const target = removing;
    setRemoving(null);
    // Xwork account password required before the method is removed.
    if (!(await requirePassword())) return;
    setBusy(true);
    const res = await removePayoutMethod(target.id).catch(() => ({
      ok: false,
    }));
    setBusy(false);
    if (res.ok) router.refresh();
  };

  const setPreferred = async (id: string) => {
    await makeDefaultPayoutMethod(id).catch(() => null);
    router.refresh();
  };

  const input =
    "w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-foreground">
          Withdrawal methods
        </h2>
        {verifyRequired ? (
          <a
            href="/settings/identity?from=withdraw"
            className="border border-border text-foreground rounded-full px-5 py-2 text-sm font-medium hover:bg-secondary"
          >
            Verify to add a method
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setStep("picker");
            }}
            className="border border-border text-foreground rounded-full px-5 py-2 text-sm font-medium hover:bg-secondary"
          >
            Add a method
          </button>
        )}
      </div>

      {methods.length === 0 ? (
        <p className="text-muted-foreground mt-4">
          You haven&apos;t added a withdrawal method yet. Add one so you can get
          paid as soon as your balance is available.
        </p>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-border">
            {methods.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                    <span aria-hidden>{methodIcon(m.type)}</span>
                    {m.label}
                    {m.is_default && (
                      <span className="text-[11px] border border-border text-muted-foreground rounded px-2 py-0.5">
                        Preferred
                      </span>
                    )}
                    {isActivating(m) && (
                      <span className="text-[11px] bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5 font-medium">
                        Activating · ready {activatesOn(m)}
                      </span>
                    )}
                  </p>
                  {m.details && (
                    <p className="text-sm text-muted-foreground truncate">
                      {m.details}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!m.is_default && (
                    <button
                      type="button"
                      onClick={() => setPreferred(m.id)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Set preferred
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemoving(m)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            New withdrawal methods take up to 3 days to activate — a security
            period that protects your earnings if your account is compromised.
          </p>
        </>
      )}

      {/* ---------------- Add-a-method modal ---------------- */}
      {step && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-xl w-full p-6 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {step === "picker" && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-bold text-foreground">
                    Add a withdrawal method
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground text-xl"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us how you want to get your funds. For all account
                  types, it may take up to 3 days to activate.
                </p>
                <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground flex gap-2">
                  <span aria-hidden>🟡</span>
                  <span>
                    The name on your withdrawal method and the name on your
                    Xwork account need to match exactly to avoid payment
                    failures or delays.
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground mt-6">
                  {country ? `Available for ${country}` : "Available options"}
                </h3>
                <div className="divide-y divide-border">
                  <PickRow
                    icon="🏦"
                    name={`Direct to Local Bank${country ? ` (${country})` : ""}`}
                    bullets={[
                      "$0.99 USD per withdrawal",
                      "Deposit to your local bank account, in every country",
                    ]}
                    solid
                    onSetup={() => setStep("bank")}
                  />
                  <PickRow
                    icon="🟠"
                    name="Payoneer"
                    bullets={[
                      "$2 USD per withdrawal",
                      "Payoneer charges additional fees to withdraw funds",
                    ]}
                    onSetup={() => setStep("leave")}
                  />
                </div>
              </>
            )}

            {step === "bank" && (
              <>
                <h2 className="text-xl font-bold text-foreground">
                  Set up Direct to Local Bank
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  International transfers need your full bank details, including
                  the SWIFT/BIC code. The account holder name must match the
                  name on your Xwork account exactly.
                </p>
                <div className="space-y-3 mt-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Account holder name (as registered with your bank)
                    </label>
                    <input
                      value={holder}
                      onChange={(e) => setHolder(e.target.value)}
                      placeholder="e.g. Muhammad Ahmed Khan"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Bank country
                    </label>
                    <select
                      value={bankCountry}
                      onChange={(e) => setBankCountry(e.target.value)}
                      className={input}
                    >
                      <option value="" disabled>
                        Select country
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Bank name
                    </label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Habib Bank Limited"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      SWIFT / BIC code
                    </label>
                    <input
                      value={swift}
                      onChange={(e) => setSwift(e.target.value.toUpperCase())}
                      placeholder="8 or 11 characters, e.g. HABBPKKA"
                      maxLength={11}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Account number / IBAN
                    </label>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. PK36HABB0000001123456702"
                      className={input}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    IBANs are checked against the international ISO standard.
                    For your security, Xwork stores only the last 4 characters
                    of your account number.
                  </p>
                </div>
                {err && <p className="text-sm text-red-500 mt-3">{err}</p>}
                <div className="flex justify-between items-center mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setErr(null);
                      setStep("picker");
                    }}
                    className="text-sm text-foreground font-medium hover:underline"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !holder.trim() ||
                      !bankName.trim() ||
                      !bankCountry ||
                      !swift.trim() ||
                      !accountNumber.trim()
                    }
                    onClick={saveBank}
                    className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                  >
                    {busy ? "Saving…" : "Save method"}
                  </button>
                </div>
              </>
            )}

            {step === "leave" && (
              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="float-right text-muted-foreground hover:text-foreground text-xl"
                >
                  ✕
                </button>
                <div className="text-6xl mt-4">🚀</div>
                <h2 className="text-2xl font-bold text-foreground mt-4">
                  You are about to leave Xwork
                </h2>
                <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                  Continuing will take you to Payoneer to finish registering
                  and connect your Payoneer card so you can get paid.
                </p>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    type="button"
                    onClick={close}
                    className="text-foreground font-medium hover:underline text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("choice")}
                    className="bg-primary text-primary-foreground rounded-full px-7 py-2.5 text-sm font-semibold hover:opacity-90"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === "choice" && (
              <>
                <h2 className="text-xl font-bold text-foreground">Payoneer</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Do you already have a Payoneer account?
                </p>
                <div className="space-y-3 mt-5">
                  <a
                    href="https://www.payoneer.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-border p-4 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <p className="font-semibold text-foreground">
                      Create a new account ↗
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Sign up on payoneer.com, then come back here and connect
                      it.
                    </p>
                  </a>
                  <button
                    type="button"
                    onClick={() => setStep("login")}
                    className="block w-full text-left rounded-xl border border-primary/50 bg-primary/5 p-4 hover:bg-primary/10"
                  >
                    <p className="font-semibold text-foreground">
                      Connect your account
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Already have Payoneer? Verify it and start getting paid.
                    </p>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("leave")}
                  className="text-sm text-foreground font-medium hover:underline mt-5"
                >
                  ← Back
                </button>
              </>
            )}

            {step === "login" && (
              <>
                <p className="font-bold text-lg">
                  <span className="text-orange-500">◯</span> Payoneer
                </p>
                <div className="text-center mt-4">
                  <div className="text-5xl">📧</div>
                  <h2 className="text-xl font-bold text-foreground mt-3">
                    What&apos;s your Payoneer email address?
                  </h2>
                  <input
                    type="email"
                    value={payoneerEmail}
                    onChange={(e) => setPayoneerEmail(e.target.value)}
                    placeholder="Business email"
                    className={`${input} max-w-sm mx-auto mt-4`}
                  />
                  {err && <p className="text-sm text-red-500 mt-3">{err}</p>}
                  <button
                    type="button"
                    disabled={busy || !payoneerEmail.trim()}
                    onClick={connect}
                    className="mt-5 bg-primary text-primary-foreground rounded-lg px-10 py-2.5 font-semibold hover:opacity-90 disabled:opacity-40"
                  >
                    Next
                  </button>
                  <p className="text-xs text-muted-foreground mt-4 max-w-sm mx-auto">
                    We verify this account with Payoneer and link its payment
                    card to your Xwork withdrawals. Your Payoneer password is
                    never entered on Xwork.
                  </p>
                </div>
              </>
            )}

            {step === "verifying" && (
              <div className="text-center py-10">
                <div className="text-5xl animate-pulse">🔄</div>
                <p className="font-semibold text-foreground mt-4">
                  Verifying your account with Payoneer…
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This only takes a moment.
                </p>
              </div>
            )}

            {step === "connected" && (
              <div className="text-center py-10">
                <div className="text-5xl">✅</div>
                <p className="font-semibold text-foreground mt-4">
                  Payoneer connected!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Taking you back to Xwork…
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Remove confirmation ---------------- */}
      {removing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setRemoving(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">
              Remove withdrawal method?
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              If you remove your {removing.label},{" "}
              {methods.length <= 1
                ? "you won't have any withdrawal methods on file."
                : "you can add it again at any time."}{" "}
              You&apos;ll be asked for your Xwork password to confirm.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setRemoving(null)}
                className="text-foreground text-sm font-medium hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmRemove}
                className="bg-red-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Remove method
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordModal}
    </>
  );
}

function PickRow({
  icon,
  name,
  bullets,
  solid,
  onSetup,
}: {
  icon: string;
  name: string;
  bullets: string[];
  solid?: boolean;
  onSetup: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <ul className="mt-1 space-y-0.5">
            {bullets.map((b) => (
              <li key={b} className="text-sm text-muted-foreground">
                ✓ {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={onSetup}
        className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold ${
          solid
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "border border-primary text-primary hover:bg-primary/5"
        }`}
      >
        Set up
      </button>
    </div>
  );
}
