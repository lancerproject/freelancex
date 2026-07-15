"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpChat } from "@/components/help-chat";

// Floating site-wide support launcher. Opens a small menu, and — the main
// feature — a live chat with Casio (our AI helper) right in the corner, on any
// page. The chat reuses the same <HelpChat/> used in the Help Center, so it
// answers questions and can draft a real support ticket for the human team.
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "chat">("menu");

  const close = () => {
    setOpen(false);
    setMode("menu");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && mode === "menu" && (
        <div className="mb-3 w-72 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="bg-primary text-primary-foreground px-5 py-4">
            <p className="font-semibold">Need a hand?</p>
            <p className="text-sm opacity-90">We&apos;re here to help.</p>
          </div>
          <div className="p-2">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary"
            >
              💬 Chat with Casio
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5">
                Live
              </span>
            </button>
            <Link
              href="/help"
              onClick={close}
              className="block px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              📚 Help center
            </Link>
            <Link
              href="/contact"
              onClick={close}
              className="block px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              ✉️ Contact support
            </Link>
            <Link
              href="/trust-safety"
              onClick={close}
              className="block px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              🛡️ Trust &amp; safety
            </Link>
          </div>
        </div>
      )}

      {open && mode === "chat" && (
        <div className="mb-3 w-[92vw] max-w-[400px] rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2.5">
            <button
              type="button"
              onClick={() => setMode("menu")}
              aria-label="Back"
              className="rounded-full px-2 py-1 text-sm hover:bg-white/15"
            >
              ←
            </button>
            <span className="font-semibold text-sm">Chat with Casio</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="ml-auto rounded-full px-2 py-1 text-sm hover:bg-white/15"
            >
              ✕
            </button>
          </div>
          {/* Reuses the Help Center chat: answers questions + drafts tickets. */}
          <HelpChat />
        </div>
      )}

      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Help and support"
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:opacity-90 transition ml-auto"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
