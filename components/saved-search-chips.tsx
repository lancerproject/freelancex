"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  renameSavedSearch,
  deleteSavedSearch,
} from "@/app/(dashboard)/jobs/search-actions";

type SavedSearch = {
  id: string;
  name?: string | null;
  query?: string | null;
  category?: string | null;
};

function hrefFor(s: SavedSearch) {
  const p = new URLSearchParams();
  if (s.query) p.set("q", s.query);
  if (s.category) p.set("category", s.category);
  const qs = p.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

function labelFor(s: SavedSearch) {
  return (
    s.name ||
    [s.query, s.category].filter(Boolean).join(" · ") ||
    "Any"
  );
}

// The freelancer's saved searches, shown as chips. "Manage" flips the row into
// edit mode where each search can be renamed inline or removed.
export function SavedSearchChips({ searches }: { searches: SavedSearch[] }) {
  const router = useRouter();
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  if (searches.length === 0) return null;

  const saveName = (id: string) => {
    const name = draft.trim();
    if (!name) return;
    startTransition(async () => {
      await renameSavedSearch(id, name).catch(() => {});
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteSavedSearch(id).catch(() => {});
      router.refresh();
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">Your saved searches</p>
        <button
          type="button"
          onClick={() => {
            setManaging((m) => !m);
            setEditing(null);
          }}
          className="text-xs font-medium text-primary hover:underline"
        >
          {managing ? "Done" : "Manage"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {searches.map((s) => {
          const isEditing = editing === s.id;
          if (isEditing) {
            return (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 bg-secondary rounded-full pl-2 pr-1 py-1"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName(s.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  maxLength={80}
                  className="bg-background border border-border rounded-full px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-40"
                />
                <button
                  type="button"
                  onClick={() => saveName(s.id)}
                  disabled={pending || !draft.trim()}
                  className="text-primary text-sm font-medium px-1 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-muted-foreground text-sm px-1"
                >
                  ✕
                </button>
              </span>
            );
          }
          return (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 bg-secondary text-foreground rounded-full pl-3 pr-2 py-1 text-sm"
            >
              <Link href={hrefFor(s)} className="hover:underline">
                {labelFor(s)}
              </Link>
              {managing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(s.id);
                      setDraft(labelFor(s));
                    }}
                    aria-label="Rename saved search"
                    className="text-muted-foreground hover:text-primary"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    aria-label="Remove saved search"
                    className="text-muted-foreground hover:text-red-500 disabled:opacity-50"
                    title="Remove"
                  >
                    ✕
                  </button>
                </>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
