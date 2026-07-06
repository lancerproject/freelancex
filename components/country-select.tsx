"use client";

import { useEffect, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { TZ_COUNTRY } from "@/lib/timezone-country";

// Country dropdown that auto-detects the user's country from their browser
// timezone (and captures the timezone). The user can still change it.
export function CountrySelect({ name = "country" }: { name?: string }) {
  const [value, setValue] = useState("");
  const [tz, setTz] = useState("");

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTz(zone);
      const detected = TZ_COUNTRY[zone];
      if (detected && (COUNTRIES as readonly string[]).includes(detected)) {
        setValue((v) => v || detected);
      }
    } catch {
      /* timezone unavailable — leave blank */
    }
  }, []);

  return (
    <>
      <select
        name={name}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border border-neutral-300 rounded-lg py-3.5 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="" disabled>
          Country
        </option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input type="hidden" name="timezone" value={tz} />
    </>
  );
}
