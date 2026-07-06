"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

// Update the current user's "Online for messages" status. Used by the navbar
// toggle; controls the green/grey presence dot others see in chat.
export async function setOnlineForMessages(online: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ online_for_messages: online })
    .eq("id", user.id);
}

// Profile visibility: 'public' | 'users' (signed-in only) | 'private'.
export async function setVisibility(value: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const v = ["public", "users", "private"].includes(value) ? value : "public";
  await supabase
    .from("profiles")
    .update({ profile_visibility: v })
    .eq("id", user.id);
}

// Freelancer preferences shown in the dashboard sidebar.
export async function setPreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({
      hours_per_week: (formData.get("hours_per_week") as string) || null,
      job_preference: (formData.get("job_preference") as string) || null,
      categories: (formData.get("categories") as string) || null,
    })
    .eq("id", user.id);
}

// Updates only the freelancer's categories (used by the Edit Categories
// accordion), leaving hours/job preference untouched.
export async function setCategories(categories: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ categories: categories || null })
    .eq("id", user.id);
}

// Marks all of the user's notifications as read, so the unread badge stays
// cleared after a full page refresh (not just in the current view).
export async function markNotificationsRead() {
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