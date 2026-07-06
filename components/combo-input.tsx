"use client";

import { useState } from "react";

// Single-value autocomplete. Suggestions filter as you type; you can also type
// any free value (used for City/Country/Location fields).
export function ComboInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  className?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = q
    ? suggestions
        .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
        .slice(0, 8)
    : [];

  const base =
    "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={className || base}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-30 w-full rounded-xl border border-border bg-card shadow-lg py-1 max-h-60 overflow-y-auto">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
