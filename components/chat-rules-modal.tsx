"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptChatRules } from "@/app/(dashboard)/messages/inbox-actions";

// One-time blocking consent shown the first time a freelancer opens Messages
// with at least one conversation. There is NO escape/outside dismiss — the
// checkbox + Confirm is the only way through (shown once, then never again).
export function ChatRulesModal() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!checked || busy) return;
    setBusy(true);
    const res = await acceptChatRules().catch(() => ({ ok: false }));
    setBusy(false);
    if (res.ok) router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-card rounded-2xl overflow-hidden max-w-2xl w-full grid grid-cols-1 sm:grid-cols-[220px_1fr]"
      >
        {/* Brand panel */}
        <div className="hidden sm:flex bg-primary items-center justify-center p-6">
          <div className="text-center">
            <div className="text-6xl">🛡️</div>
            <p className="text-primary-foreground font-bold text-lg mt-3">
              <span className="opacity-90">X</span>work
            </p>
          </div>
        </div>

        {/* Rules */}
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground">
            Stay safe on Xwork by following the rules
          </h2>
          <div className="space-y-3 mt-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Do not share personal contact information or external links
              before signing a contract. Once a contract is in place, limit
              information sharing to only what is necessary.
            </p>
            <p className="text-foreground font-medium">
              Payments must always be completed on Xwork.
            </p>
            <p>
              Violations of these rules will result in permanent account
              suspension.
            </p>
            <Link
              href="/trust-safety"
              className="text-primary underline hover:no-underline inline-block"
            >
              Learn more
            </Link>
          </div>

          <label className="flex items-start gap-3 mt-5 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--primary)]"
            />
            <span>
              I understand that I agreed to keep payments and pre-contract
              chats on Xwork per the{" "}
              <Link
                href="/user-agreement"
                className="underline hover:no-underline"
              >
                User Agreement
              </Link>
              .
            </span>
          </label>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={confirm}
              disabled={!checked || busy}
              className="bg-primary text-primary-foreground rounded-full px-8 py-2.5 font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Confirming…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
