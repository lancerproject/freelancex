"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import {
  NOTIFICATION_CATEGORIES,
  DEFAULT_PREFS,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import { getMembership } from "@/lib/membership";

// Saves the user's notification preferences. Sanitizes the incoming object to
// the known categories/channels so only valid booleans are stored.
export async function saveNotificationPrefs(
  incoming: NotificationPrefs
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, membership_status, membership_end_date, membership_autorenew")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = getMembership(profile).isPro;

  const clean: NotificationPrefs = {};
  for (const c of NOTIFICATION_CATEGORIES) {
    // Pro-only categories can't be changed by Basic users — force the default.
    if (c.pro && !isPro) {
      clean[c.key] = { ...DEFAULT_PREFS[c.key] };
      continue;
    }
    const v = incoming?.[c.key];
    clean[c.key] = {
      inapp: v?.inapp !== false,
      email: v?.email !== false,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: clean })
    .eq("id", user.id);
  if (error) {
    return {
      ok: false,
      error:
        "Couldn't save. Please run the notification-prefs.sql migration in Supabase, then try again.",
    };
  }

  revalidatePath("/settings/notifications");
  return { ok: true };
}
