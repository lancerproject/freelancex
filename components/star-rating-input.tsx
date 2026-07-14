"use client";

import { useState } from "react";

// Interactive 1–5 star picker. Renders clickable stars with hover preview and
// writes the chosen value into a hidden <input name={name}> so it posts with
// the surrounding <form action={...}>. Used in the end-contract feedback flow.
export function StarRatingInput({
  name,
  required = false,
  defaultValue = 0,
  size = "text-3xl",
}: {
  name: string;
  required?: boolean;
  defaultValue?: number;
  size?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const labels = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className="inline-flex items-center gap-0.5" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setValue(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={`${size} leading-none transition-transform hover:scale-110 ${
                n <= shown ? "text-yellow-500" : "text-gray-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {shown > 0 && (
          <span className="text-sm text-muted-foreground">
            {shown}.0 — {labels[shown]}
          </span>
        )}
      </div>
      {/* required is enforced via the hidden input's value ("" fails required) */}
      <input
        type="hidden"
        name={name}
        value={value || ""}
        required={required}
      />
    </div>
  );
}
