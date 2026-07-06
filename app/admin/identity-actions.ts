"use server";

import { createClient } from "@/lib/supabase-server";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Manual identity review — approve or reject documents that couldn't be
// auto-verified (face matching unavailable). Admin only.

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) redirect("/dashboard");
  return { supabase };
}

export async function approveIdentity(userId: string) {
  const { supabase } = await ensureAdmin();

  await supabase
    .from("profiles")
    .update({
      id_verified: true,
      id_verified_at: new Date().toISOString(),
      id_review_status: "approved",
      id_review_note: null,
    })
    .eq("id", userId)
    .eq("id_review_status", "pending");

  await notify(
    supabase,
    userId,
    "account",
    "Identity verified 🎉",
    "Our team reviewed your documents — your identity is verified! You're all set to apply and get paid.",
    "/profile"
  );
  revalidatePath("/admin/identity");
  redirect("/admin/identity");
}

export async function rejectIdentity(userId: string, formData: FormData) {
  const { supabase } = await ensureAdmin();
  const note =
    ((formData.get("note") as string) || "").trim() ||
    "The documents were unclear or didn't match the account details.";

  await supabase
    .from("profiles")
    .update({
      id_verified: false,
      id_review_status: "rejected",
      id_review_note: note,
    })
    .eq("id", userId)
    .eq("id_review_status", "pending");

  await notify(
    supabase,
    userId,
    "account",
    "Identity review — action needed",
    `We couldn't verify your documents: ${note} Please go to Settings → Identity verification and try again with clearer photos.`,
    "/settings/identity"
  );
  revalidatePath("/admin/identity");
  redirect("/admin/identity");
}
