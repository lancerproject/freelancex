import React from "react";
import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  async function markAllRead() {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);
    redirect("/notifications");
  }

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-sm text-blue-600 hover:underline"
            >
              Mark all as read ({unreadCount})
            </button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {notifications?.length === 0 && (
          <p className="text-gray-500">No notifications yet.</p>
        )}

        {notifications?.map((notification) => (
          <Link
            key={notification.id}
            href={notification.link || "/"}
            className={`block border rounded-lg p-4 hover:bg-gray-50 ${
              !notification.is_read ? "border-blue-300 bg-blue-50" : ""
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{notification.title}</p>
                <p className="text-gray-600 text-sm mt-1">
                  {notification.message}
                </p>
              </div>
              {!notification.is_read && (
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-1 ml-2 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(notification.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}