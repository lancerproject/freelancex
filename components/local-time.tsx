"use client";

import { useEffect, useState } from "react";

export function LocalTime({ timezone }: { timezone?: string }) {
  const [t, setT] = useState("");
  useEffect(() => {
    const update = () => {
      try {
        setT(
          new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: timezone || undefined,
          })
        );
      } catch {
        setT(
          new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        );
      }
    };
    update();
    const i = setInterval(update, 30000);
    return () => clearInterval(i);
  }, [timezone]);
  return <>{t}</>;
}
