"use client";

import { useEffect, useState } from "react";

// Renders just the time-of-day greeting word ("Good morning" …) using the
// viewer's own device timezone, refreshed every minute so it stays live.
export function GreetingWord() {
  const [g, setG] = useState("Hi");

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      setG(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return <>{g}</>;
}
