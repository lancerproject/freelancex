import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";

// Resolves a freelancer's shareable URL (xwork.com/freelancer/<slug>) to their
// public profile. <slug> may be a username (custom slug) or a raw user id — any
// shared link should work, whether or not the freelancer activated a Pro custom
// URL. Resolved via the service role so it works for logged-out visitors too
// (the route only reads the id to redirect; no personal data is exposed here).
export default async function FreelancerBySlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  // 1) Match by username (custom slug) — active or not, so plain shared links
  //    resolve for everyone, not just Pro members with an activated slug.
  const { data: byName } = await admin
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .limit(1)
    .maybeSingle();
  if (byName?.id) redirect(`/profile/${byName.id}`);

  // 2) Fallback: the slug is actually a raw user id.
  const { data: byId } = await admin
    .from("profiles")
    .select("id")
    .eq("id", slug)
    .maybeSingle();
  if (byId?.id) redirect(`/profile/${byId.id}`);

  notFound();
}
