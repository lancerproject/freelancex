import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// Resolves a Pro freelancer's custom URL (xwork.com/freelancer/<slug>) to their
// public profile. Also accepts a raw user id as a fallback so old links keep
// working. The canonical profile renderer stays at /profile/[id].
export default async function FreelancerBySlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1) Active custom slug.
  const { data: bySlug } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .eq("custom_slug_active", true)
    .maybeSingle();
  if (bySlug?.id) redirect(`/profile/${bySlug.id}`);

  // 2) Fallback: the slug is actually a user id.
  const { data: byId } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", slug)
    .maybeSingle();
  if (byId?.id) redirect(`/profile/${byId.id}`);

  notFound();
}
