"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/app/notifications/actions";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsList({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();
  // Highlight reflects what was unread when the page loaded; it doesn't change
  // as we mark them read, so the user still sees what was new this visit.
  const initialUnread = useRef(
    notifications.filter((n) => !n.is_read).length
  ).current;
  const [marked, setMarked] = useState(false);

  // Opening the page = seeing them. Mark everything read so the bell clears,
  // then refresh so the navbar badge updates. Runs once, on mount only.
  useEffect(() => {
    if (initialUnread === 0 || marked) return;
    setMarked(true);
    markAllRead().then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (notifications.length === 0) {
    return <p className="text-muted-foreground">No notifications yet.</p>;
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => (
        <Link
          key={n.id}
          href={n.link || "/"}
          className={`block rounded-2xl border p-4 transition hover:border-primary ${
            !n.is_read ? "border-primary bg-secondary" : "border-border bg-card"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-foreground">{n.title}</p>
              <p className="text-muted-foreground text-sm mt-1">{n.message}</p>
            </div>
            {!n.is_read && (
              <span className="w-2 h-2 bg-primary rounded-full mt-1 ml-2 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(n.created_at).toLocaleString()}
          </p>
        </Link>
      ))}
    </div>
  );
}
