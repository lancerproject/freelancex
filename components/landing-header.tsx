"use client";

import Link from "next/link";
import { useState } from "react";
import { FIND_TALENT, FIND_WORK, WHY_XWORK, NavCategory } from "@/lib/nav-data";

type MenuKey = "talent" | "work" | "why" | null;

export function LandingHeader() {
  const [open, setOpen] = useState<MenuKey>(null);

  return (
    <header
      className="border-b border-neutral-200 bg-white sticky top-0 z-40"
      onMouseLeave={() => setOpen(null)}
    >
      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-primary">X</span>
          <span className="text-neutral-900">work</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm text-neutral-700">
          <NavButton
            label="Find talent"
            active={open === "talent"}
            onEnter={() => setOpen("talent")}
          />
          <NavButton
            label="Find work"
            active={open === "work"}
            onEnter={() => setOpen("work")}
          />
          <NavButton
            label="Why Xwork"
            active={open === "why"}
            onEnter={() => setOpen("why")}
          />
          <Link
            href="/pricing"
            className="px-3 py-2 rounded-md hover:bg-neutral-100"
            onMouseEnter={() => setOpen(null)}
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-neutral-700">
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </div>

      {/* Mega-menu panels */}
      {open === "talent" && (
        <CategoryMega
          categories={FIND_TALENT}
          seeAllLabel="See all skills"
          seeAllHref="/hire"
        />
      )}
      {open === "work" && (
        <CategoryMega
          categories={FIND_WORK}
          seeAllLabel="See all jobs"
          seeAllHref="/register/freelancer"
        />
      )}
      {open === "why" && <WhyMega />}
    </header>
  );
}

function NavButton({
  label,
  active,
  onEnter,
}: {
  label: string;
  active: boolean;
  onEnter: () => void;
}) {
  return (
    <button
      onMouseEnter={onEnter}
      className={`px-3 py-2 rounded-md hover:bg-neutral-100 ${
        active ? "text-primary font-medium" : ""
      }`}
    >
      {label}
    </button>
  );
}

function CategoryMega({
  categories,
  seeAllLabel,
  seeAllHref,
}: {
  categories: NavCategory[];
  seeAllLabel: string;
  seeAllHref: string;
}) {
  const [activeCat, setActiveCat] = useState(0);
  const cat = categories[activeCat];

  return (
    <div className="absolute left-0 right-0 top-full bg-white border-b border-neutral-200 shadow-lg">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-8 flex gap-8">
        {/* Category list */}
        <div className="w-64 shrink-0 border-r border-neutral-200 pr-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3 px-3">
            Categories
          </p>
          {categories.map((c, i) => (
            <button
              key={c.name}
              onMouseEnter={() => setActiveCat(i)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between ${
                i === activeCat
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {c.name}
              <span aria-hidden>›</span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-4">
            {cat.name}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {cat.items.map((it) => (
              <Link
                key={it.title}
                href="/register"
                className="group block"
              >
                <p className="font-medium text-neutral-900 group-hover:text-primary">
                  {it.title}
                </p>
                <p className="text-sm text-neutral-500">{it.desc}</p>
              </Link>
            ))}
          </div>
          <Link
            href={seeAllHref}
            className="inline-block mt-6 text-primary font-medium hover:underline"
          >
            {seeAllLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

function WhyMega() {
  return (
    <div className="absolute left-0 right-0 top-full bg-white border-b border-neutral-200 shadow-lg">
      <div className="max-w-[1480px] mx-auto px-6 lg:px-12 py-8">
        <h3 className="text-xl font-bold text-neutral-900">
          Learn about Xwork
        </h3>
        <p className="text-neutral-500 mb-6">
          Get to know the platform built for the future of work.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">
              Resources
            </p>
            <div className="space-y-4">
              {WHY_XWORK.resources.map((it) => (
                <Link key={it.title} href="/register" className="group block">
                  <p className="font-medium text-neutral-900 group-hover:text-primary">
                    {it.title}
                  </p>
                  <p className="text-sm text-neutral-500">{it.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">
              What&apos;s new
            </p>
            <div className="space-y-4">
              {WHY_XWORK.whatsNew.map((it) => (
                <Link key={it.title} href="/register" className="group block">
                  <p className="font-medium text-neutral-900 group-hover:text-primary">
                    {it.title}
                  </p>
                  <p className="text-sm text-neutral-500">{it.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Link
          href="/register"
          className="inline-block mt-6 text-primary font-medium hover:underline"
        >
          See more resources
        </Link>
      </div>
    </div>
  );
}
