import { createClient } from "@/lib/supabase-server";
import { LandingHeader } from "@/components/landing-header";

// Renders the marketing header ONLY for logged-out visitors. Logged-in users
// already have the global app navbar (from the root layout), so this prevents
// the double-header that showed on content/legal/help pages.
export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return null;
  return <LandingHeader />;
}
