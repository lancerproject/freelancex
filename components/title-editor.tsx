"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";

const MAX = 100;

export function TitleEditor({
  title,
  example,
}: {
  title: string | null;
  example: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(title || "");
  const [touched, setTouched] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const trimmed = value.trim();
  const empty = trimmed.length === 0;

  const save = () => {
    if (empty) {
      setTouched(true);
      return;
    }
    const fd = new FormData();
    fd.set("title", value.slice(0, MAX));
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
          setValue(title || "");
          setTouched(false);
          setOpen(true);
        }}
        aria-label="Edit title"
        title="Edit title"
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
              <h2 className="text-2xl font-bold text-foreground">
                Edit your title
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-muted-foreground mt-3">
              Enter a single sentence description of your professional
              skills/experience (e.g. Expert Web Designer with Ajax experience)
            </p>

            <label className="block font-semibold text-foreground mt-6 mb-1">
              Your title <span className="text-destructive">*</span>
            </label>
            <input
              value={value}
              maxLength={MAX}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={example}
              className={`w-full bg-background border rounded-lg p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                touched && empty ? "border-destructive" : "border-border"
              }`}
            />
            <div className="flex items-center justify-between mt-1.5">
              {touched && empty ? (
                <span className="text-sm text-destructive flex items-center gap-1">
                  <span>⚠</span> This field is required.
                </span>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {MAX - value.length} characters left
              </span>
            </div>

            <div className="flex justify-end items-center gap-4 mt-16">
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
                disabled={empty || pending}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
