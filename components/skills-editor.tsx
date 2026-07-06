"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";
import { TagInput } from "@/components/tag-input";
import { ALL_SKILLS, SKILL_KEYWORDS } from "@/lib/skills";

const MAX = 25;

export function SkillsEditor({ skills }: { skills: string }) {
  const parse = (s: string) =>
    String(s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(parse(skills));
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () => {
    const fd = new FormData();
    fd.set("skills", tags.join(", "));
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTags(parse(skills));
          setOpen(true);
        }}
        aria-label="Edit skills"
        title="Edit skills"
        className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-3xl w-full p-7 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">Edit skills</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <label className="block font-semibold text-foreground mt-6 mb-1">
              Your skills
            </label>
            <TagInput
              value={tags}
              onChange={setTags}
              max={MAX}
              suggestions={ALL_SKILLS}
              keywords={SKILL_KEYWORDS}
              placeholder="Search skills"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Maximum {MAX} skills. ({tags.length}/{MAX})
            </p>

            <div className="flex justify-end items-center gap-4 mt-10">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
