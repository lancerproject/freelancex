"use client";

import { useState, useTransition } from "react";
import { LANGUAGES, PROFICIENCY_LEVELS } from "@/lib/languages";
import { saveLanguages } from "@/app/create-profile/actions";

type Lang = { language: string; proficiency: string };

export function LanguagesStep({
  initialEnglishLevel = "",
  initialExtra = [],
}: {
  initialEnglishLevel?: string;
  initialExtra?: Lang[];
}) {
  const [englishLevel, setEnglishLevel] = useState(initialEnglishLevel);
  const [extra, setExtra] = useState<Lang[]>(initialExtra);
  const [pending, startTransition] = useTransition();

  const addRow = () => setExtra((p) => [...p, { language: "", proficiency: "" }]);
  const removeRow = (i: number) =>
    setExtra((p) => p.filter((_, x) => x !== i));
  const setRow = (i: number, k: keyof Lang, v: string) =>
    setExtra((p) => p.map((r, x) => (x === i ? { ...r, [k]: v } : r)));

  // Languages already chosen (so each dropdown hides duplicates).
  const taken = new Set(["English", ...extra.map((e) => e.language)]);

  const proceed = () => {
    const list: Lang[] = [
      { language: "English", proficiency: englishLevel || "Fluent" },
      ...extra.filter((e) => e.language && e.proficiency),
    ];
    const fd = new FormData();
    fd.set("languages", JSON.stringify(list));
    startTransition(() => saveLanguages(fd));
  };

  const selectClass =
    "rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary bg-white";

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        Looking good. Next, tell us which languages you speak.
      </h1>
      <p className="text-neutral-600 mt-3 max-w-3xl">
        Xwork is global, so clients are often interested to know which languages
        you speak. English is a must — but do you speak any others?
      </p>

      {/* header row */}
      <div className="grid grid-cols-2 gap-8 mt-10 max-w-3xl">
        <p className="font-medium text-neutral-800">Language</p>
        <p className="font-medium text-neutral-800">Proficiency</p>
      </div>

      {/* English (fixed) */}
      <div className="grid grid-cols-2 gap-8 items-center py-4 border-b border-neutral-200 max-w-3xl">
        <span className="text-neutral-600">English (all profiles include this)</span>
        <select
          value={englishLevel}
          onChange={(e) => setEnglishLevel(e.target.value)}
          className={selectClass}
        >
          <option value="">My level is</option>
          {PROFICIENCY_LEVELS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* extra languages */}
      {extra.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-2 gap-8 items-center py-4 border-b border-neutral-200 max-w-3xl"
        >
          <div className="flex items-center gap-2">
            <select
              value={row.language}
              onChange={(e) => setRow(i, "language", e.target.value)}
              className={`${selectClass} flex-1`}
            >
              <option value="">Select a language</option>
              {LANGUAGES.filter(
                (l) => l === row.language || !taken.has(l)
              ).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label="Remove language"
              className="text-neutral-400 hover:text-orange-500 text-lg shrink-0"
            >
              ✕
            </button>
          </div>
          <select
            value={row.proficiency}
            onChange={(e) => setRow(i, "proficiency", e.target.value)}
            className={selectClass}
          >
            <option value="">My level is</option>
            {PROFICIENCY_LEVELS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="mt-6 inline-flex items-center gap-2 border border-primary text-primary rounded-full px-5 py-2.5 font-semibold hover:bg-primary/5 transition"
      >
        <span className="text-lg leading-none">+</span> Add a language
      </button>

      {/* footer */}
      <div className="flex items-center justify-between mt-12">
        <a
          href="/create-profile/education"
          className="px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
        >
          Back
        </a>
        <button
          type="button"
          onClick={proceed}
          disabled={pending}
          className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Next, write an overview"}
        </button>
      </div>
    </div>
  );
}
