"use client";

import { useState } from "react";

export function SearchableSelect({
  name,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [value, setValue] = useState(defaultValue || "");

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-card border border-border rounded-lg p-3 text-left"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-xs text-muted-foreground">▾</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full p-2.5 border-b border-border bg-background text-sm text-foreground outline-none sticky top-0"
            />
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  setValue(o.value);
                  setOpen(false);
                  setSearch("");
                }}
                className="block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary"
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No matches.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
