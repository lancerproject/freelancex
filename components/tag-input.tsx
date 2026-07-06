"use client";

import { useState } from "react";

export function TagInput({
  value,
  onChange,
  max,
  suggestions = [],
  keywords = {},
  placeholder = "Type to search…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  suggestions?: string[];
  keywords?: Record<string, string>;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const q = input.trim().toLowerCase();
  const full = value.length >= max;
  const matches = q
    ? suggestions
        .filter(
          (s) =>
            (s.toLowerCase().includes(q) ||
              (keywords[s] || "").toLowerCase().includes(q)) &&
            !value.some((v) => v.toLowerCase() === s.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const add = (raw: string) => {
    const s = raw.trim();
    if (!s || full) return;
    if (value.some((v) => v.toLowerCase() === s.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...value, s]);
    setInput("");
    setOpen(false);
  };
  const removeAt = (i: number) => onChange(value.filter((_, x) => x !== i));

  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 bg-secondary text-foreground rounded-full pl-3 pr-2 py-1 text-sm"
          >
            {t}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove ${t}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[140px]">
          <input
            value={input}
            disabled={full}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(input);
              } else if (e.key === "Backspace" && !input && value.length) {
                removeAt(value.length - 1);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder={full ? "Maximum reached" : placeholder}
            className="w-full bg-transparent text-foreground outline-none py-1 text-sm disabled:cursor-not-allowed"
          />
          {open && matches.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-30 w-64 max-w-[80vw] rounded-xl border border-border bg-card shadow-lg py-1 max-h-60 overflow-y-auto">
              {matches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  className="block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
