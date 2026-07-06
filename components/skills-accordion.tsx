"use client";

import Link from "next/link";
import { useState } from "react";
import { HIRE_CATEGORIES } from "@/lib/hire-skills";

export function SkillsAccordion() {
  const [mode, setMode] = useState<"solo" | "teams">("solo");
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      {/* Solo / Teams toggle */}
      <div className="inline-flex rounded-full border border-neutral-300 p-1 mb-4">
        <button
          onClick={() => setMode("solo")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            mode === "solo"
              ? "bg-primary text-primary-foreground"
              : "text-neutral-700"
          }`}
        >
          Solo professionals
        </button>
        <button
          onClick={() => setMode("teams")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            mode === "teams"
              ? "bg-primary text-primary-foreground"
              : "text-neutral-700"
          }`}
        >
          Teams
        </button>
      </div>

      <p className="text-neutral-600 mb-4">
        {mode === "solo"
          ? "Hiring a professional is great for growing your team or working on a project."
          : "Hire an agency or team to take on larger, ongoing projects end-to-end."}
      </p>

      <div className="border-t border-neutral-200">
        {HIRE_CATEGORIES.map((cat, i) => {
          const isOpen = open === i;
          return (
            <div key={cat.name} className="border-b border-neutral-200">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="font-medium text-neutral-900">{cat.name}</span>
                <span
                  className={`text-neutral-500 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  ⌄
                </span>
              </button>
              {isOpen && (
                <div className="pb-5 flex flex-wrap gap-x-8 gap-y-2">
                  {cat.skills.map((s) => (
                    <Link
                      key={s}
                      href="/register/client"
                      className="text-primary hover:underline text-sm"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
