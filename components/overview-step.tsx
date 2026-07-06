"use client";

import { useState, useTransition } from "react";
import { saveOverview } from "@/app/create-profile/actions";

const MIN = 100;
const MAX = 5000;

export function OverviewStep({ initialBio = "" }: { initialBio?: string }) {
  const [bio, setBio] = useState(initialBio);
  const [showError, setShowError] = useState(false);
  const [pending, startTransition] = useTransition();

  const enough = bio.trim().length >= MIN;

  const submit = () => {
    if (!enough) {
      setShowError(true);
      return;
    }
    const fd = new FormData();
    fd.set("bio", bio.trim());
    startTransition(() => saveOverview(fd));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      {/* Left — editor */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Great. Now write a bio to tell the world about yourself.
        </h1>
        <p className="text-neutral-600 mt-3">
          Help people get to know you at a glance. What work do you do best?
          Tell them clearly, using paragraphs or bullet points. You can always
          edit later — just make sure you proofread now.
        </p>

        <textarea
          value={bio}
          maxLength={MAX}
          onChange={(e) => {
            setShowError(false);
            setBio(e.target.value);
          }}
          rows={8}
          placeholder="Enter your top skills, experiences, and interests. This is one of the first things clients will see on your profile."
          className="w-full mt-8 rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary resize-y"
        />
        <div className="flex justify-between mt-1.5">
          {showError ? (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span>⚠</span> Please write at least {MIN} characters.
            </p>
          ) : (
            <span />
          )}
          <span
            className={`text-sm ${
              enough ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            {enough
              ? `${bio.length}/${MAX} characters`
              : `${bio.trim().length}/${MIN} — at least ${MIN} characters`}
          </span>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between mt-12">
          <a
            href="/create-profile/languages"
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
            {pending ? "Saving…" : "Next, set your rate"}
          </button>
        </div>
      </div>

      {/* Right — example profile card (original Xwork sample, drawn avatar) */}
      <div className="rounded-2xl border border-neutral-200 p-8 max-w-md">
        <div className="relative w-28 h-28 mx-auto">
          {/* self-drawn illustrated avatar — no third-party image */}
          <svg viewBox="0 0 112 112" className="w-28 h-28" role="img" aria-label="Profile illustration">
            <circle cx="56" cy="56" r="56" fill="#FCE7D6" />
            <path d="M56 60c11 0 20-9 20-20s-9-20-20-20-20 9-20 20 9 20 20 20Z" fill="#5B3A29" />
            <circle cx="56" cy="44" r="16" fill="#F2C8A0" />
            <path d="M44 40c0-7 5-12 12-12s12 5 12 12c-4 1-8-2-12-2s-8 3-12 2Z" fill="#3A2417" />
            <path d="M28 104c0-16 13-26 28-26s28 10 28 26H28Z" fill="#9333ea" />
            <path d="M48 80h16v8a8 8 0 0 1-16 0v-8Z" fill="#F2C8A0" />
          </svg>
          <span className="absolute top-1 right-3 w-5 h-5 rounded-full bg-primary border-2 border-white" />
        </div>
        <h2 className="text-2xl font-semibold text-center mt-4">Nadia K.</h2>
        <div className="flex items-center justify-center gap-5 text-sm text-neutral-600 mt-2">
          <span>★ 4.9</span>
          <span>$45.00/hr</span>
          <span>87 jobs</span>
        </div>
        <div className="text-neutral-700 mt-6 space-y-3 text-[15px] leading-relaxed">
          <p>
            I&apos;m a brand and graphic designer who helps startups and small
            businesses look professional from day one. From a single logo to a
            full brand kit, I turn rough ideas into visuals people remember.
          </p>
          <p>• Logo design, brand identity and style guides</p>
          <p>• Social media, ad and marketing graphics</p>
          <p>• Clear communication and on-time delivery, every time</p>
        </div>
      </div>
    </div>
  );
}
