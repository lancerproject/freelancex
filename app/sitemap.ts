import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase-server";

// Set NEXT_PUBLIC_SITE_URL to your real domain in production (e.g.
// https://xwork.com) so the sitemap emits absolute, crawlable URLs.
const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://thexwork.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/hire",
    "/pricing",
    "/trust-safety",
    "/about",
    "/login",
    "/register",
    "/categories",
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p || "/"}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  // Public freelancer profiles are indexable.
  try {
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, profile_visibility")
      .eq("role", "freelancer")
      .limit(2000);
    for (const p of profiles ?? []) {
      // Only fully-public profiles are indexable.
      if ((p.profile_visibility || "public") !== "public") continue;
      entries.push({
        url: `${BASE}/profile/${p.id}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If the DB isn't reachable at build time, ship the static entries only.
  }

  return entries;
}
