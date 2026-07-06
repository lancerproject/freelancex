"use client";

import { useState } from "react";
import { ComboInput } from "@/components/combo-input";
import { CITIES } from "@/lib/cities";
import { COUNTRIES } from "@/lib/countries";

const LOCATION_SUGGESTIONS = [...CITIES, ...COUNTRIES];

// Location input with city/country autocomplete; submits via the given `name`
// inside a parent form (used in the profile header edit modal).
export function LocationField({
  name,
  label,
  defaultValue,
  placeholder = "City, Country",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue || "");
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <ComboInput
        name={name}
        value={value}
        onChange={setValue}
        suggestions={LOCATION_SUGGESTIONS}
        placeholder={placeholder}
      />
    </div>
  );
}
