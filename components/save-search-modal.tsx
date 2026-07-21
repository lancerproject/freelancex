"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSearch } from "@/app/(dashboard)/jobs/search-actions";

// "Save search as" dialog (Upwork parity). The freelancer picks a name for the
// current search + filters; on save we show a confirmation toast and refresh so
// the search shows up under My Feed. The name defaults to the query, then the
// category, then "Any".
export function SaveSearchModal({
  q = "",
  category = "",
  experienceLevel = "",
  minBudget = "",
  defaultName,
}: {
  q?: string;
  category?: string;
  experienceLevel?: string;
  minBudget?: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName || q || category || "Any");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("q", q);
    fd.set("category", category);
    fd.set("experience_level", experienceLevel);
    fd.set("min_budget", minBudget);
    startTransition(async () => {
      const res: { ok: boolean; error?: string; name?: string } =
        await saveSearch(fd).catch(() => ({
          ok: false,
          error: "Something went wrong.",
        }));
      if (res.ok) {
        setOpen(false);
        setToast(`${res.name} - Search has been saved.`);
        router.refresh();
        setTimeout(() => setToast(null), 4000);
      } else {
        setError(res.error || "Couldn't save your search.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(defaultName || q || category || "Any");
          setError("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 border border-primary text-primary rounded-full px-4 py-1.5 text-sm font-medium hover:bg-primary/10"
      >
        ♡ Save search
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Save search as
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mt-4 relative">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim() && !pending) submit();
                }}
                placeholder="Name this search"
                maxLength={80}
                className="w-full border border-border rounded-lg px-3 py-2.5 pr-9 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName("")}
                  aria-label="Clear"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-muted-foreground hover:bg-secondary"
                >
                  ×
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={pending || !name.trim()}
              className="w-full mt-4 bg-primary text-primary-foreground rounded-full py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>

            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Saving this search will save the query and all the filters that are
              currently applied. Results from your saved searches appear in My
              Feed.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-neutral-900 text-white px-4 py-3 shadow-lg text-sm">
          <span className="text-green-400">✓</span>
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
