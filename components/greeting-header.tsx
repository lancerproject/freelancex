"use client";

import { useEffect, useState } from "react";

// Greets the freelancer by name using their own local time of day. An optional
// badge (e.g. the ⭐ Pro pill) renders inline next to the name — never wrap
// this card in a flex row from outside, or it shrink-wraps to content width.
export function GreetingHeader({
  name,
  badge,
}: {
  name?: string;
  badge?: React.ReactNode;
}) {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Uses the viewer's own device time (their timezone) and refreshes every
    // minute, so the greeting flips live at noon / 6pm without a reload.
    const update = () => {
      const h = new Date().getHours();
      setGreeting(
        h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
      );
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8 mb-6 rounded-2xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2 flex-wrap">
        <span>
          {greeting ? `${greeting}, ` : "Hi "}
          {name || "there"} 👋
        </span>
        {badge}
      </h1>
      <p className="text-muted-foreground mt-1">
        Welcome back — here are jobs you might like today.
      </p>
    </div>
  );
}
