"use client";

import { useEffect, useState } from "react";

// Dark bar atop the Messages pages inviting the user to enable desktop
// notifications for incoming messages (with a tone). Shows only while browser
// permission hasn't been decided and the user hasn't dismissed it.
export function DesktopAlertsBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = localStorage.getItem("xwork_desktop_alerts_dismissed");
    setVisible(Notification.permission === "default" && !dismissed);
  }, []);

  if (!visible) return null;

  const enable = async () => {
    try {
      await Notification.requestPermission();
    } finally {
      setVisible(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem("xwork_desktop_alerts_dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="bg-neutral-900 text-white text-sm px-4 py-2.5 flex items-center gap-3">
      <span aria-hidden>💡</span>
      <p className="flex-1">
        Desktop alerts are not enabled on this browser.{" "}
        <button
          type="button"
          onClick={enable}
          className="underline font-semibold hover:no-underline"
        >
          Click Here
        </button>{" "}
        to enable desktop alerts.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-white/70 hover:text-white text-lg leading-none"
      >
        ✕
      </button>
    </div>
  );
}
