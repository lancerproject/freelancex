"use client";

import Link from "next/link";
import { useState } from "react";

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="bg-primary text-primary-foreground px-5 py-4">
            <p className="font-semibold">Need a hand?</p>
            <p className="text-sm opacity-90">We&apos;re here to help.</p>
          </div>
          <div className="p-2">
            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              📚 Help center
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              ✉️ Contact support
            </Link>
            <Link
              href="/trust-safety"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              🛡️ Trust &amp; safety
            </Link>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Help and support"
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:opacity-90 transition"
      >
        {open ? "✕" : "?"}
      </button>
    </div>
  );
}
