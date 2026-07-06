"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SLIDES = [
  {
    subtitle: "Get hired faster",
    title: "A complete profile gets you noticed by more clients",
    cta: "Complete your profile",
    href: "/profile",
    emoji: "🚀",
  },
  {
    subtitle: "Keep more of what you earn",
    title: "Go Pro and pay just 5% service fee instead of 10%",
    cta: "Explore Pro",
    href: "/settings/membership",
    emoji: "⭐",
  },
  {
    subtitle: "Track your progress",
    title: "Check your proposal stats and see how your profile is performing",
    cta: "View my stats",
    href: "/stats",
    emoji: "📊",
  },
];

export function BannerCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="relative rounded-2xl bg-neutral-900 text-white p-8 mb-6 overflow-hidden">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-neutral-300">{slide.subtitle}</p>
          <h2 className="text-xl font-bold mt-1 max-w-md leading-snug">{slide.title}</h2>
          <Link
            href={slide.href}
            className="inline-block mt-5 bg-white text-neutral-900 px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition"
          >
            {slide.cta}
          </Link>
        </div>
        <div className="hidden md:block text-5xl shrink-0">{slide.emoji}</div>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2 mt-5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-white w-6" : "bg-white/35 w-1.5 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
