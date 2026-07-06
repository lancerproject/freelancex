"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HELP_ARTICLES } from "@/lib/help-center";

export function HelpSearch() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return HELP_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.body.some((p) => p.toLowerCase().includes(term))
    ).slice(0, 8);
  }, [q]);

  return (
    <div className="relative max-w-2xl mx-auto">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for help…"
        className="w-full rounded-full border border-neutral-300 bg-white px-6 py-4 text-neutral-900 outline-none focus:ring-2 focus:ring-primary/40"
      />
      {results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-10 text-left">
          {results.map((a) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="block px-5 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
            >
              <p className="font-medium text-neutral-900">{a.title}</p>
            </Link>
          ))}
        </div>
      )}
      {q.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg px-5 py-4 z-10 text-left text-neutral-500">
          No articles found. Try different words, or visit{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
          .
        </div>
      )}
    </div>
  );
}
