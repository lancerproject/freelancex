"use client";

import { useState } from "react";

// Shows long text truncated to a few lines with a "more"/"less" toggle,
// matching Upwork's overview / experience / employment descriptions.
export function ExpandableText({
  text,
  className = "",
  clamp = "line-clamp-4",
}: {
  text: string | null | undefined;
  className?: string;
  clamp?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const long = text.length > 260 || text.split("\n").length > 4;

  return (
    <div>
      <p
        className={`whitespace-pre-wrap ${className} ${
          !open && long ? clamp : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-primary text-sm font-medium hover:underline mt-1"
        >
          {open ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
