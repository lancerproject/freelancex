import { createClient } from "@/lib/supabase-server";
import { loadOwnProfile } from "@/lib/own-profile";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/profile-settings";
import { getMembership } from "@/lib/membership";

export const metadata = { title: "Profile Settings | Xwork" };

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadOwnProfile(user.id);

  const categories = Array.from(
    new Set(
      String(profile?.categories || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    )
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Profile Settings</h2>

      <ProfileSettings
        initial={{
          visibility: profile?.profile_visibility || "public",
          username: profile?.username || "",
          projectPref: profile?.project_preference || "both",
          hideEarnings: !!profile?.hide_earnings,
          experience: profile?.experience_level || "",
          categories,
        }}
        isPro={getMembership(profile).isPro}
      />
    </div>
  );
}
