"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPreferences } from "@/app/actions";
import { CategoryEditor } from "@/components/category-editor";

export function PreferencesCard({
  hours,
  jobPref,
  categories,
}: {
  hours?: string;
  jobPref?: string;
  categories?: string;
}) {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const cats = String(categories || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const submit = (formData: FormData) => {
    setOpen(false);
    startTransition(() => {
      setPreferences(formData).then(() => router.refresh());
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Preferences</h3>
        <button
          onClick={() => setOpen(true)}
          aria-label="Edit preferences"
          className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
        >
          ✎
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Hours per week</p>
          <p className="text-foreground">{hours || "No preference set"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Job preference</p>
          <p className="text-foreground">{jobPref || "No preference set"}</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">My categories</p>
            <button
              onClick={() => setCatOpen(true)}
              aria-label="Edit categories"
              className="w-7 h-7 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition text-sm"
            >
              ✎
            </button>
          </div>
          {cats.length ? (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {cats.map((c) => (
                <Link
                  key={c}
                  href={`/jobs?category=${encodeURIComponent(c)}`}
                  className="text-primary hover:underline"
                >
                  {c}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-foreground">No preference set</p>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <form
            action={submit}
            className="bg-card rounded-2xl border border-border max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-foreground">
              Edit preferences
            </h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Hours per week
              </label>
              <select
                name="hours_per_week"
                defaultValue={hours || ""}
                className="w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm"
              >
                <option value="">Select…</option>
                <option>As needed - open to offers</option>
                <option>Less than 30 hrs/week</option>
                <option>More than 30 hrs/week</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Job preference
              </label>
              <select
                name="job_preference"
                defaultValue={jobPref || ""}
                className="w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm"
              >
                <option value="">Select…</option>
                <option>Open to all jobs</option>
                <option>Open to contract-to-hire roles</option>
                <option>Long-term work only</option>
                <option>Short-term work only</option>
              </select>
            </div>
            {/* Categories are edited via the dedicated Edit Categories
                accordion; keep the current value so saving prefs doesn't wipe it. */}
            <input type="hidden" name="categories" value={categories || ""} />
            <p className="text-xs text-muted-foreground">
              Edit your categories from the pencil next to “My categories”.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {catOpen && (
        <CategoryEditor initial={cats} onClose={() => setCatOpen(false)} />
      )}
    </div>
  );
}
