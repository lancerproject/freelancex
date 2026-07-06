"use server";

import { createClient } from "@/lib/supabase-server";

// Marks all of the current user's notifications as read. Called when the
// notifications page is opened (so "seen" becomes "marked"), and by the
// "Mark all as read" button.
export async function markAllRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}
