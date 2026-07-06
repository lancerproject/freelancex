"use client";

import { useState } from "react";

// The five rules below mirror Supabase's password policy (lowercase, uppercase,
// number, symbol + min length). Showing them live means users never hit the
// raw "Password should contain at least one character of each…" error.
const RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "lower", label: "One lowercase letter (a–z)", test: (v) => /[a-z]/.test(v) },
  { key: "upper", label: "One uppercase letter (A–Z)", test: (v) => /[A-Z]/.test(v) },
  { key: "number", label: "One number (0–9)", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character (!@#$%…)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export function PasswordInput({
  name = "password",
  placeholder = "Password (8 or more characters)",
  showStrength = false,
  autoComplete = "new-password",
}: {
  name?: string;
  placeholder?: string;
  showStrength?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");

  const results = RULES.map((r) => ({ ...r, ok: r.test(value) }));
  const met = results.filter((r) => r.ok).length;

  // Strength tied to how many policy rules are satisfied (max 5).
  const level =
    value.length === 0 ? null : met <= 2 ? "weak" : met <= 4 ? "medium" : "strong";

  const meta = {
    weak: { label: "Weak", bars: 1, text: "text-red-600", bar: "bg-red-500" },
    medium: { label: "Medium", bars: 2, text: "text-amber-600", bar: "bg-amber-500" },
    strong: { label: "Strong", bars: 3, text: "text-primary", bar: "bg-primary" },
  } as const;

  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          minLength={8}
          required
          autoComplete={autoComplete}
          className="w-full border border-neutral-300 rounded-lg py-3.5 px-4 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800"
        >
          {show ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {showStrength && level && (
        <div className="mt-2">
          {/* strength bar: weak / medium / strong */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < meta[level].bars ? meta[level].bar : "bg-neutral-200"
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs font-semibold ${meta[level].text}`}>
              {meta[level].label}
            </span>
          </div>

          {/* live checklist */}
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {results.map((r) => (
              <li
                key={r.key}
                className={`flex items-center gap-1.5 text-xs ${
                  r.ok ? "text-primary" : "text-neutral-500"
                }`}
              >
                <span className="w-4 text-center">{r.ok ? "✓" : "•"}</span>
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
