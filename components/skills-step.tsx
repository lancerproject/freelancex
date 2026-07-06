"use client";

import { useState, useTransition } from "react";
import { TagInput } from "@/components/tag-input";
import { ALL_SKILLS, SKILL_KEYWORDS } from "@/lib/skills";
import { saveSkills } from "@/app/create-profile/actions";

const MAX_SKILLS = 25;

export function SkillsStep({
  suggested,
  initialSkills = [],
}: {
  suggested: string[];
  initialSkills?: string[];
}) {
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [showError, setShowError] = useState(false);
  const [pending, startTransition] = useTransition();

  const addSuggested = (s: string) => {
    setShowError(false);
    setSkills((prev) => {
      if (prev.length >= MAX_SKILLS) return prev;
      if (prev.some((x) => x.toLowerCase() === s.toLowerCase())) return prev;
      return [...prev, s];
    });
  };

  // Suggested chips that haven't already been picked.
  const remainingSuggestions = suggested.filter(
    (s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())
  );

  const submit = () => {
    if (skills.length === 0) {
      setShowError(true);
      return;
    }
    const fd = new FormData();
    fd.set("skills", skills.join(", "));
    startTransition(() => saveSkills(fd));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      {/* Left */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Nearly there! What work are you here to do?
        </h1>
        <p className="text-neutral-600 mt-3">
          Your skills show clients what you can offer and help us recommend the
          right jobs. Add or remove the ones we&apos;ve suggested, or start
          typing to pick more — it&apos;s up to you.
        </p>

        <label className="block text-neutral-800 font-medium mt-8 mb-2">
          Your skills
        </label>
        <TagInput
          value={skills}
          onChange={(next) => {
            setShowError(false);
            setSkills(next.slice(0, MAX_SKILLS));
          }}
          max={MAX_SKILLS}
          suggestions={ALL_SKILLS}
          keywords={SKILL_KEYWORDS}
          placeholder="Enter skills here"
        />
        <p className="text-right text-sm text-neutral-500 mt-1.5">
          Max {MAX_SKILLS} skills
        </p>

        {showError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
            <span>⚠</span> Please add at least one skill to continue.
          </p>
        )}

        {remainingSuggestions.length > 0 && (
          <div className="mt-6">
            <p className="text-neutral-800 font-medium mb-3">Suggested skills</p>
            <div className="flex flex-wrap gap-2.5">
              {remainingSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSuggested(s)}
                  disabled={skills.length >= MAX_SKILLS}
                  className="inline-flex items-center gap-1.5 border border-neutral-300 rounded-full px-3.5 py-1.5 text-sm text-neutral-800 hover:border-primary hover:text-primary transition disabled:opacity-40"
                >
                  <span className="text-base leading-none">+</span> {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* footer */}
        <div className="flex items-center justify-between mt-12">
          <a
            href="/create-profile/work"
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
            {pending ? "Saving…" : "Next, your profile title"}
          </button>
        </div>
      </div>

      {/* Right — pro tip */}
      <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8 max-w-md lg:mt-16">
        <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
          X
        </div>
        <p className="text-2xl font-medium leading-snug mt-6">
          “Xwork recommends jobs to you based on your skills — so choose them
          carefully to get the best matches!”
        </p>
        <p className="text-neutral-500 mt-4">Xwork Pro Tip</p>
      </div>
    </div>
  );
}
