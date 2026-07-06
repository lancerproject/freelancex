"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/notify";
import { getMembership } from "@/lib/membership";

// Slug rules for a custom profile URL: 3–30 chars, lowercase letters, digits
// and hyphens only. Kept local (non-exported) so this stays a valid
// "use server" file.
function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}
function validateSlug(slug: string): { ok: boolean; error?: string } {
  if (slug.length < 3) return { ok: false, error: "Use at least 3 characters." };
  if (slug.length > 30) return { ok: false, error: "Use 30 characters or fewer." };
  if (!/^[a-z0-9-]+$/.test(slug))
    return { ok: false, error: "Only letters, numbers and hyphens." };
  // Reserved words that collide with /freelancer/* routes.
  if (["offers", "health", "membership"].includes(slug))
    return { ok: false, error: "That URL is reserved. Try another." };
  return { ok: true };
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const RP = () => revalidatePath("/settings/profile");

// Account-activity notification for a profile-settings change.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function note(supabase: any, userId: string, what: string) {
  await notify(
    supabase,
    userId,
    "account",
    "Profile settings updated",
    `${what} If this wasn't you, change your password.`,
    "/settings/profile"
  );
}

export async function setVisibility(value: string) {
  const { supabase, user } = await authed();
  if (!user) return;
  const v = ["public", "users", "private"].includes(value) ? value : "public";
  await supabase.from("profiles").update({ profile_visibility: v }).eq("id", user.id);
  await note(supabase, user.id, "Your profile visibility was changed.");
  RP();
}

export async function setProjectPreference(value: string) {
  const { supabase, user } = await authed();
  if (!user) return;
  const v = ["both", "short_term", "long_term"].includes(value) ? value : "both";
  await supabase.from("profiles").update({ project_preference: v }).eq("id", user.id);
  await note(supabase, user.id, "Your project preference was updated.");
  RP();
}

export async function setHideEarnings(value: boolean) {
  const { supabase, user } = await authed();
  if (!user) return;
  await supabase.from("profiles").update({ hide_earnings: value }).eq("id", user.id);
  await note(supabase, user.id, "Your earnings privacy setting was changed.");
  RP();
}

export async function setExperienceLevel(value: string) {
  const { supabase, user } = await authed();
  if (!user) return;
  const v = ["entry", "intermediate", "expert"].includes(value) ? value : null;
  await supabase.from("profiles").update({ experience_level: v }).eq("id", user.id);
  await note(supabase, user.id, "Your experience level was updated.");
  RP();
}

export async function setUsername(
  value: string
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!slug) return { ok: false, error: "Enter a handle." };
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { ok: false, error: "That URL is already taken." };
  await supabase.from("profiles").update({ username: slug }).eq("id", user.id);
  await note(supabase, user.id, "Your custom profile URL was changed.");
  RP();
  return { ok: true, slug };
}

// Availability check for a custom URL slug (Pro feature). Read-only.
export async function checkSlug(
  value: string
): Promise<{ available: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { available: false, error: "Not signed in." };
  const slug = normalizeSlug(value);
  const v = validateSlug(slug);
  if (!v.ok) return { available: false, error: v.error };
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .neq("id", user.id)
    .maybeSingle();
  return { available: !taken };
}

// Save a custom profile URL (Pro only). Stores the slug in `username` and marks
// it active so /freelancer/<slug> resolves.
export async function saveCustomUrl(
  value: string
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!getMembership(profile).isPro)
    return { ok: false, error: "Custom Profile URL is a Pro feature." };

  const slug = normalizeSlug(value);
  const v = validateSlug(slug);
  if (!v.ok) return { ok: false, error: v.error };

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .neq("id", user.id)
    .maybeSingle();
  if (taken)
    return { ok: false, error: "This URL is already in use. Try another." };

  await supabase
    .from("profiles")
    .update({ username: slug, custom_slug_active: true })
    .eq("id", user.id);
  await note(supabase, user.id, "Your custom profile URL was changed.");
  RP();
  return { ok: true, slug };
}

export async function setCategories(value: string) {
  const { supabase, user } = await authed();
  if (!user) return;
  await supabase.from("profiles").update({ categories: value || null }).eq("id", user.id);
  await note(supabase, user.id, "Your categories were updated.");
  RP();
}
