"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type ChecklistItem = {
  key: string;
  label: string;
  sub: string;
  weight: number;
  done: boolean;
};

export function CompleteProfileModal({
  percent,
  photo,
  items,
}: {
  percent: number;
  photo?: string | null;
  items: ChecklistItem[];
}) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  // Pop up shortly after the dashboard loads — once per browser session.
  useEffect(() => {
    if (percent >= 100) return;
    if (sessionStorage.getItem("xwork_profile_modal_closed") === "1") return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [percent]);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem("xwork_profile_modal_closed", "1");
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  // ring geometry
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(percent, 100) / 100);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[88vh] overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Left — progress ring */}
        <div className="bg-neutral-50 p-8 flex flex-col items-center justify-center text-center">
          <div className="relative w-36 h-36">
            <svg width="144" height="144" className="-rotate-90">
              <circle cx="72" cy="72" r={R} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="72"
                cy="72"
                r={R}
                fill="none"
                stroke="#9333ea"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl">
                  👤
                </div>
              )}
            </div>
          </div>
          <p className="text-neutral-600 mt-4">{percent}% complete</p>
          <p className="text-xl font-bold mt-1">
            {percent >= 100 ? "All done! 🎉" : "You're almost done!"}
          </p>
          <Link
            href="/user-agreement"
            className="text-sm underline mt-2 text-neutral-700"
          >
            Learn more
          </Link>
        </div>

        {/* Right — checklist */}
        <div className="p-7 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                Complete your profile
              </h2>
              <p className="text-neutral-600 mt-1 text-sm max-w-md">
                Freelancers with complete, quality profiles are{" "}
                <span className="text-primary font-semibold">
                  4.5 times more likely
                </span>{" "}
                to get hired by clients.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-neutral-500 hover:text-neutral-900 text-xl shrink-0"
            >
              ✕
            </button>
          </div>

          {/* To-do items */}
          <div className="mt-5 divide-y divide-neutral-200">
            {todo.map((i) => (
              <Link
                key={i.key}
                href={`/profile?open=${i.key}`}
                className="flex items-center gap-3 py-3 group"
              >
                <span className="w-6 h-6 rounded-full border-2 border-neutral-300 shrink-0" />
                <span className="flex-1">
                  <span className="block font-semibold text-neutral-900 group-hover:text-primary">
                    {i.label}
                  </span>
                  <span className="block text-sm text-neutral-500">
                    {i.sub} <span className="text-primary">(+{i.weight}%)</span>
                  </span>
                </span>
                <span className="text-neutral-400 group-hover:text-primary">›</span>
              </Link>
            ))}
          </div>

          {/* Completed (collapsible) */}
          {done.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowDone((s) => !s)}
                className="font-semibold underline flex items-center gap-1"
              >
                {showDone ? "Hide" : "Show"} completed ({done.length})
                <span className="text-xs">{showDone ? "▲" : "▼"}</span>
              </button>
              {showDone && (
                <>
                  <p className="text-sm text-neutral-500 mt-1">
                    Nicely done! These items are checked off the list.
                  </p>
                  <div className="mt-2 divide-y divide-neutral-200">
                    {done.map((i) => (
                      <Link
                        key={i.key}
                        href={`/profile?open=${i.key}`}
                        className="flex items-center gap-3 py-3 group"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">
                          ✓
                        </span>
                        <span className="flex-1">
                          <span className="block font-semibold text-neutral-900 group-hover:text-primary">
                            {i.label}
                          </span>
                          <span className="block text-sm text-neutral-500">
                            {i.sub}
                          </span>
                        </span>
                        <span className="text-neutral-400 group-hover:text-primary">›</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={close}
              className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
