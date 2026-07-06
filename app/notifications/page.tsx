import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import { NotificationsList } from "@/components/notifications-list";
import { markAllRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, message, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  async function markAllReadAction() {
    "use server";
    await markAllRead();
    redirect("/notifications");
  }

  return (
    <main className="min-h-screen px-4 lg:px-8 py-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className="text-sm text-primary hover:underline">
              Mark all as read ({unreadCount})
            </button>
          </form>
        )}
      </div>

      <NotificationsList notifications={notifications ?? []} />
    </main>
  );
}
