"use client";

import { useState } from "react";

// Job description with a "Show more / Show less" toggle when it's long,
// preserving the client's line breaks.
export function JobDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const clean = text || "";
  const isLong = clean.length > 300;
  const shown = expanded || !isLong ? clean : clean.slice(0, 300).trimEnd() + "…";

  return (
    <div>
      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {shown}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-primary hover:underline text-sm font-medium mt-2"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
