"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";

const MAX = 5000;

export function DescriptionEditor({ bio }: { bio: string | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(bio || "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () => {
    const fd = new FormData();
    fd.set("bio", value.slice(0, MAX));
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
          setValue(bio || "");
          setOpen(true);
        }}
        aria-label="Edit description"
        title="Edit description"
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
            className="bg-card rounded-2xl border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto p-7 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Profile overview
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
              Use this space to show clients you have the skills and experience
              they&apos;re looking for.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1 text-muted-foreground text-sm">
              <li>Describe your strengths and skills</li>
              <li>Highlight projects, accomplishments and education</li>
              <li>Keep it short and make sure it&apos;s error-free</li>
            </ul>
            <Link
              href="/help"
              className="inline-block mt-3 text-sm text-purple-600 hover:underline"
            >
              Learn more about building your profile
            </Link>

            <label className="block font-semibold text-foreground mt-6 mb-1">
              Profile overview
            </label>
            <textarea
              value={value}
              maxLength={MAX}
              rows={10}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Describe your experience and what you offer clients."
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <div className="text-right mt-1.5 text-xs text-muted-foreground">
              {MAX - value.length} characters left
            </div>

            <div className="flex justify-end items-center gap-4 mt-6">
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
