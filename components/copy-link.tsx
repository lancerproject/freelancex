"use client";

import { useState } from "react";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div>
      <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground truncate">
        {path}
      </div>
      <button
        onClick={copy}
        className="text-primary text-sm font-medium mt-2 hover:underline"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
