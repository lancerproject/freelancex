"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WORK_CATEGORIES, WORK_CATEGORY_NAMES } from "@/lib/work-categories";
import { setCategories } from "@/app/actions";

const MAX = 10;

// Upwork-style "Edit Categories" modal: an accordion of category groups; expand
// one to pick its specialties (checkboxes). Up to 10, at least one required.
export function CategoryEditor({
  initial,
  onClose,
  onSaved,
  beforeSave,
}: {
  initial: string[];
  onClose: () => void;
  onSaved?: (selected: string[]) => void;
  // Optional gate run right before persisting (e.g. a password confirmation).
  // If it resolves false, the save is aborted and the editor stays open.
  beforeSave?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Dedupe on init so a doubled/legacy stored value can't inflate the count.
  const [selected, setSelected] = useState<string[]>(() =>
    Array.from(new Set(initial))
  );
  const [error, setError] = useState(false);
  // Open the first group that already has a selection.
  const [openCat, setOpenCat] = useState<string | null>(
    WORK_CATEGORY_NAMES.find((c) =>
      (WORK_CATEGORIES[c] || []).some((s) => initial.includes(s))
    ) ?? null
  );

  const toggle = (s: string) => {
    setError(false);
    setSelected((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= MAX) return prev; // cap at 10
      return [...prev, s];
    });
  };

  const save = () => {
    if (selected.length === 0) {
      setError(true);
      return;
    }
    const unique = Array.from(new Set(selected));
    const value = unique.join(", ");
    startTransition(async () => {
      if (beforeSave && !(await beforeSave())) return;
      await setCategories(value);
      onSaved?.(unique);
      router.refresh();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-xl p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold text-foreground">Edit Categories</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground text-xl"
          >
            ✕
          </button>
        </div>

        <p className="text-foreground mt-3 font-medium">
          What are the main services you offer to clients?
        </p>
        <p className="text-sm text-muted-foreground">
          Select up to {MAX} categories. {selected.length}/{MAX} selected.
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5">
            <span aria-hidden>⚠</span> You must select at least one type of work.
          </p>
        )}

        {/* Selected items float to the top as removable chips (the list below
            keeps its original order). Clicking ✕ deselects the item, which also
            unchecks it in the list, returning it to its original position. */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-2 bg-secondary text-foreground rounded-full pl-3 pr-2 py-1 text-sm"
              >
                {s}
                <button
                  type="button"
                  onClick={() => toggle(s)}
                  aria-label={`Remove ${s}`}
                  className="w-4 h-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border divide-y divide-border max-h-[55vh] overflow-y-auto">
          {WORK_CATEGORY_NAMES.map((cat) => {
            const items = WORK_CATEGORIES[cat] || [];
            const isOpen = openCat === cat;
            const countInCat = items.filter((s) => selected.includes(s)).length;
            return (
              <div key={cat}>
                <button
                  type="button"
                  onClick={() => setOpenCat(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary"
                >
                  <span className="font-medium text-foreground">
                    {cat}
                    {countInCat > 0 && (
                      <span className="ml-2 text-xs text-primary">
                        ({countInCat})
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    ⌄
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 space-y-1">
                    {items.map((s) => {
                      const checked = selected.includes(s);
                      const disabled = !checked && selected.length >= MAX;
                      return (
                        <label
                          key={s}
                          className={`flex items-center gap-3 py-1.5 cursor-pointer ${
                            disabled ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(s)}
                            className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-foreground">{s}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end items-center gap-5 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground font-medium hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={selected.length === 0 || pending}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
