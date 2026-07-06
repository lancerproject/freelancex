"use client";

import { useState } from "react";
import { PHONE_COUNTRIES, flagOf } from "@/lib/phone-countries";

export function PhoneInput({ defaultValue }: { defaultValue?: string }) {
  const stripped = (defaultValue || "").replace(/\s+/g, "");

  const initialCountry =
    PHONE_COUNTRIES.find((c) => stripped.startsWith(`+${c.dial}`)) ||
    PHONE_COUNTRIES.find((c) => c.iso2 === "US")!;
  const initialNumber = stripped.startsWith(`+${initialCountry.dial}`)
    ? stripped.slice(`+${initialCountry.dial}`.length)
    : defaultValue || "";

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState(initialCountry);
  const [number, setNumber] = useState(initialNumber);

  const filtered = PHONE_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search)
  );

  return (
    <div className="relative">
      <input
        type="hidden"
        name="phone"
        value={number.trim() ? `+${country.dial} ${number.trim()}` : ""}
      />
      <div className="flex items-stretch border border-border rounded-lg bg-background overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 px-3 border-r border-border"
        >
          <span className="text-lg">{flagOf(country.iso2)}</span>
          <span className="text-xs text-muted-foreground">▾</span>
        </button>
        <span className="flex items-center px-3 text-muted-foreground border-r border-border">
          +{country.dial}
        </span>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="300 0000000"
          className="flex-1 bg-transparent px-3 py-3 text-foreground outline-none"
        />
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute z-30 mt-1 w-72 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full p-2.5 border-b border-border bg-background text-sm text-foreground outline-none sticky top-0"
            />
            {filtered.map((c) => (
              <button
                type="button"
                key={c.iso2 + c.dial}
                onClick={() => {
                  setCountry(c);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left"
              >
                <span className="text-lg">{flagOf(c.iso2)}</span>
                <span className="flex-1 text-foreground">{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
