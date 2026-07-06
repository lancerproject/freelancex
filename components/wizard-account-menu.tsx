"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions";

// The avatar button in the create-profile header. While the profile is being
// built it only offers "Log out"; once it's submitted (the congrats page) it
// becomes the full account menu. Pass `full` on post-submit pages.
export function WizardAccountMenu({ full = false }: { full?: boolean }) {
  const [open, setOpen] = useState(false);

  const links = [
    { icon: "👤", label: "Your profile", href: "/profile" },
    { icon: "🪪", label: "Membership plan", href: "/settings/membership" },
    { icon: "⚙️", label: "Account settings", href: "/settings" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg z-50 overflow-hidden"
          >
            {full && (
              <div className="py-1">
                {links.map((i) => (
                  <Link
                    key={i.label}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
                  >
                    <span className="w-5 text-center">{i.icon}</span>
                    {i.label}
                  </Link>
                ))}
              </div>
            )}
            <form action={logout} className={full ? "border-t border-neutral-200" : ""}>
              <button
                type="submit"
                className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-neutral-50"
              >
                Log out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
