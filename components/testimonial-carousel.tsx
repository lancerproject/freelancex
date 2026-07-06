"use client";

import { useState } from "react";

// Top-earning freelancer spotlights shown on the onboarding page, the way
// Upwork rotates established earners. Original Xwork profiles + quotes.
type Spotlight = {
  name: string;
  title: string;
  rating: string;
  rate: string;
  jobs: string;
  quote: string;
  accent: string; // avatar background
};

const SPOTLIGHTS: Spotlight[] = [
  {
    name: "Aisha R.",
    title: "Brand & Logo Designer",
    rating: "5.0",
    rate: "$70.00/hr",
    jobs: "120 jobs",
    quote:
      "Xwork gave me the freedom to pick the projects I love — and the confidence to raise my rates.",
    accent: "bg-rose-100 text-rose-700",
  },
  {
    name: "Daniel O.",
    title: "Full-Stack Developer",
    rating: "4.9",
    rate: "$85.00/hr",
    jobs: "64 jobs",
    quote:
      "I replaced my office job with steady, high-quality clients I found right here on Xwork.",
    accent: "bg-sky-100 text-sky-700",
  },
  {
    name: "Mei L.",
    title: "Content Strategist",
    rating: "5.0",
    rate: "$55.00/hr",
    jobs: "90 jobs",
    quote:
      "From my first contract to long-term retainers, Xwork has been the backbone of my business.",
    accent: "bg-amber-100 text-amber-700",
  },
  {
    name: "Carlos M.",
    title: "Video Editor",
    rating: "4.9",
    rate: "$60.00/hr",
    jobs: "150 jobs",
    quote:
      "The clients are serious, the payments are safe, and the work just keeps coming.",
    accent: "bg-violet-100 text-violet-700",
  },
  {
    name: "Priya S.",
    title: "Mobile App Developer",
    rating: "5.0",
    rate: "$95.00/hr",
    jobs: "48 jobs",
    quote:
      "Xwork helped me build a client list I'm proud of — all on my own schedule.",
    accent: "bg-purple-100 text-purple-700",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TestimonialCarousel() {
  const [i, setI] = useState(0);
  const total = SPOTLIGHTS.length;
  const s = SPOTLIGHTS[i];

  const prev = () => setI((v) => (v - 1 + total) % total);
  const next = () => setI((v) => (v + 1) % total);

  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <button
        type="button"
        onClick={prev}
        aria-label="Previous profile"
        className="shrink-0 w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition"
      >
        ←
      </button>

      <div className="flex-1 rounded-2xl border border-neutral-200 p-8 max-w-md mx-auto">
        <div className="relative w-24 h-24 mx-auto">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-semibold ${s.accent}`}
          >
            {initials(s.name)}
          </div>
          {/* online dot */}
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary border-2 border-white" />
          {/* top-rated badge */}
          <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center border-2 border-white">
            ★
          </span>
        </div>

        <h2 className="text-xl font-semibold text-center mt-4">{s.name}</h2>
        <p className="text-center text-neutral-500">{s.title}</p>
        <div className="flex items-center justify-center gap-4 text-sm text-neutral-600 mt-2">
          <span>★ {s.rating}</span>
          <span>{s.rate}</span>
          <span>{s.jobs}</span>
        </div>
        <p className="text-center text-lg text-neutral-800 mt-6 leading-relaxed">
          “{s.quote}”
        </p>

        {/* dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {SPOTLIGHTS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-primary" : "w-1.5 bg-neutral-300"
              }`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={next}
        aria-label="Next profile"
        className="shrink-0 w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition"
      >
        →
      </button>
    </div>
  );
}
