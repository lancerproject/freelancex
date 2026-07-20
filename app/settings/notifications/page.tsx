import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { NotificationSettings } from "@/components/notification-settings";
import { withDefaults } from "@/lib/notification-prefs";
import { getMembership } from "@/lib/membership";

export const metadata = { title: "Notification settings | Xwork" };

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadOwnProfile(user.id);

  const initial = withDefaults(profile?.notification_prefs ?? null);
  const isPro = getMembership(profile).isPro;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Notification settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose how you want to hear from Xwork. For each kind of activity, pick
          whether you get an in-app notification, an email, or both.
        </p>
      </div>

      <NotificationSettings initial={initial} isPro={isPro} />
    </div>
  );
}
