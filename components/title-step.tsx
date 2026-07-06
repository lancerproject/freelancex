"use client";

import { useState, useTransition } from "react";
import { saveTitle } from "@/app/create-profile/actions";

const MAX_TITLE = 100;

export function TitleStep({
  example,
  initialTitle = "",
}: {
  example: string;
  initialTitle?: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [showError, setShowError] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!title.trim()) {
      setShowError(true);
      return;
    }
    const fd = new FormData();
    fd.set("title", title.trim());
    startTransition(() => saveTitle(fd));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        Got it. Now, add a title to tell the world what you do.
      </h1>
      <p className="text-neutral-600 mt-3 max-w-2xl">
        It&apos;s the very first thing clients see, so make it count. Stand out
        by describing your expertise in your own words.
      </p>

      <label className="block text-neutral-800 font-medium mt-10 mb-2">
        Your professional role
      </label>
      <input
        value={title}
        maxLength={MAX_TITLE}
        onChange={(e) => {
          setShowError(false);
          setTitle(e.target.value);
        }}
        placeholder={`Example: ${example}`}
        className="w-full max-w-2xl rounded-lg border border-neutral-300 px-4 py-3.5 text-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <div className="flex max-w-2xl justify-between mt-1.5">
        {showError ? (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <span>⚠</span> Please add a title to continue.
          </p>
        ) : (
          <span />
        )}
        <span className="text-sm text-neutral-500">
          {title.length}/{MAX_TITLE}
        </span>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between mt-12">
        <a
          href="/create-profile/skills"
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
          {pending ? "Saving…" : "Next, add your experience"}
        </button>
      </div>
    </div>
  );
}
