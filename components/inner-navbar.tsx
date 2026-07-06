import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export default async function InnerNavbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  const unreadCount = count || 0;

  return (
    <nav className="bg-background border-b px-8 py-4 flex items-center justify-between z-50 sticky top-0">
      <Link href="/" className="text-xl font-bold text-primary">
        Xwork
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/jobs" className="text-muted-foreground hover:text-foreground">
          Browse Jobs
        </Link>
        <Link href="/contracts" className="text-muted-foreground hover:text-foreground">
          Contracts
        </Link>
        <Link href="/profile" className="text-muted-foreground hover:text-foreground">
          Profile
        </Link>
        <Link
          href="/notifications"
          className="relative text-muted-foreground hover:text-foreground"
        >
          🔔 Notifications
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}