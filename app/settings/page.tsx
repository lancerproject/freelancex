import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// /settings has no page of its own — send users to the first settings section
// for their account type (clients: My info; freelancers: Contact info).
export default async function SettingsIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "client") redirect("/settings/my-info");
  redirect("/settings/contact");
}
