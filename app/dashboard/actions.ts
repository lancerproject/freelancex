"use server";

import { createClient } from "../../lib/supabase-server";
import { cookies } from "next/headers";

export async function createProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Real name from sign-up form, or from Google (full_name / name).
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    "";

  // Role the user chose at sign-up. For email sign-up it's in auth metadata;
  // for Google sign-up it's in a short-lived cookie set when they clicked
  // "Continue with Google" on a sign-up page. Used ONLY when first creating
  // the profile — an existing account's role is NEVER changed here.
  const metaRole = user.user_metadata?.role as string | undefined;
  let chosenRole =
    metaRole === "client" || metaRole === "freelancer" ? metaRole : undefined;
  if (!chosenRole) {
    const cookieRole = (await cookies()).get("xwork_signup_role")?.value;
    if (cookieRole === "client" || cookieRole === "freelancer")
      chosenRole = cookieRole;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {};
    // Backfill a missing real name.
    if (!existing.full_name && fullName) updates.full_name = fullName;
    // Honor the role picked at sign-up. A DB trigger / earlier load can
    // pre-create the profile (defaulting to "client") before this runs, so if
    // the user explicitly signed up with a different role (cookie/metadata is
    // only present during sign-up), apply it.
    if (chosenRole && existing.role !== chosenRole) updates.role = chosenRole;
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
    return;
  }

  const username = user.email?.split("@")[0] || "user";

  await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    username,
    full_name: fullName,
    role: chosenRole || "client",
  });
}