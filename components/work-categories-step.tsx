"use client";

import { useState, useTransition } from "react";
import { WORK_CATEGORIES, WORK_CATEGORY_NAMES } from "@/lib/work-categories";
import { saveWorkCategory } from "@/app/create-profile/actions";

const MAX_SPECIALTIES = 3;

export function WorkCategoriesStep({
  initialCategory = "",
  initialSpecialties = [],
}: {
  initialCategory?: string;
  initialSpecialties?: string[];
}) {
  // Only pre-select a stored category if it's a real category in our list.
  const validInitial =
    initialCategory && WORK_CATEGORIES[initialCategory] ? initialCategory : null;
  const [category, setCategory] = useState<string | null>(validInitial);
  const [specialties, setSpecialties] = useState<string[]>(
    validInitial ? initialSpecialties : []
  );
  const [showError, setShowError] = useState(false);
  const [pending, startTransition] = useTransition();

  const pickCategory = (c: string) => {
    if (c === category) return;
    setCategory(c);
    setSpecialties([]); // reset specialties when switching category
    setShowError(false);
  };

  const toggleSpecialty = (s: string) => {
    setShowError(false);
    setSpecialties((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= MAX_SPECIALTIES) return prev; // cap at 3
      return [...prev, s];
    });
  };

  const submit = () => {
    if (!category || specialties.length === 0) {
      setShowError(true);
      return;
    }
    const fd = new FormData();
    fd.set("category", category);
    fd.set("specialties", specialties.join(", "));
    startTransition(() => saveWorkCategory(fd));
  };

  const options = (category && WORK_CATEGORIES[category]) || [];

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        Great, so what kind of work are you here to do?
      </h1>
      <p className="text-neutral-600 mt-3">
        Don&apos;t worry, you can change these choices later on.
      </p>

      <div className="border-t border-neutral-200 mt-6 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: categories */}
        <div>
          <p className="text-sm text-neutral-500 mb-4">Select 1 category</p>
          <ul className="md:border-r md:border-neutral-200 md:pr-6">
            {WORK_CATEGORY_NAMES.map((c) => {
              const active = c === category;
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => pickCategory(c)}
                    className={`w-full text-left py-2.5 text-lg transition ${
                      active
                        ? "text-primary font-semibold"
                        : "text-neutral-800 hover:text-primary"
                    }`}
                  >
                    {c}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: specialties — only after a category is chosen */}
        <div>
          {category ? (
            <>
              <p className="text-sm text-neutral-500 mb-4">
                Now, select 1 to 3 specialties
              </p>
              <ul className="space-y-1">
                {options.map((s) => {
                  const checked = specialties.includes(s);
                  const disabled =
                    !checked && specialties.length >= MAX_SPECIALTIES;
                  return (
                    <li key={s}>
                      <label
                        className={`flex items-center gap-3 py-2.5 cursor-pointer ${
                          disabled ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSpecialty(s)}
                          className="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary"
                        />
                        <span className="text-lg text-neutral-800">{s}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-neutral-400 mt-9">
              Select a category on the left to see its specialties.
            </p>
          )}
        </div>
      </div>

      {showError && (
        <p className="mt-6 text-sm text-red-600 flex items-center gap-1.5">
          <span>⚠</span> Please select a category and at least one specialty.
        </p>
      )}

      {/* footer */}
      <div className="flex items-center justify-between mt-12">
        <a
          href="/create-profile"
          className="px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
        >
          Back
        </a>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Next, add your skills"}
        </button>
      </div>
    </div>
  );
}
