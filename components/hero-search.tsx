"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroSearch() {
  const [mode, setMode] = useState<"hire" | "work">("hire");
  const [q, setQ] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/register");
  };

  return (
    <div className="max-w-xl">
      <div className="inline-flex rounded-full bg-white/15 p-1 mb-4">
        <button
          onClick={() => setMode("hire")}
          className={`px-5 py-1.5 rounded-full text-sm font-medium ${
            mode === "hire" ? "bg-white text-neutral-900" : "text-white"
          }`}
        >
          I want to hire
        </button>
        <button
          onClick={() => setMode("work")}
          className={`px-5 py-1.5 rounded-full text-sm font-medium ${
            mode === "work" ? "bg-white text-neutral-900" : "text-white"
          }`}
        >
          I want to work
        </button>
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-2 bg-white rounded-full p-1.5 shadow-lg"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            mode === "hire"
              ? "Describe what you need done…"
              : "Search for work…"
          }
          className="flex-1 bg-transparent px-4 py-2.5 text-neutral-900 outline-none"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-medium hover:opacity-90"
        >
          🔍 Search
        </button>
      </form>
    </div>
  );
}
