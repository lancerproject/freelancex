"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { notify } from "@/lib/notify";

// Changes the account password. Flow (matches the standard secure pattern):
//  1. Re-verify the CURRENT password.
//  2. Validate the new password (length + at least one number or symbol).
//  3. Update it, then sign out of all devices so every session must re-auth.
export async function changePassword(
  formData: FormData
): Promise<{ ok: false; error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const current = String(formData.get("current_password") || "");
  const next = String(formData.get("new_password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  if (next !== confirm) {
    return { ok: false, error: "The new passwords don't match." };
  }
  if (next.length < 8 || !/[\d\W]/.test(next)) {
    return {
      ok: false,
      error: "Password must be at least 8 characters and include 1 number or symbol.",
    };
  }
  if (next === current) {
    return { ok: false, error: "Your new password must be different from the current one." };
  }

  // 1. Verify the current password.
  const { error: pwErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (pwErr) {
    return { ok: false, error: "Your current password is incorrect." };
  }

  // 2 + 3. Update and sign out everywhere.
  const { error: updErr } = await supabase.auth.updateUser({ password: next });
  if (updErr) {
    return { ok: false, error: updErr.message || "Couldn't update your password." };
  }

  // Notify before signing out, so the alert is waiting when they log back in.
  await notify(
    supabase,
    user.id,
    "security",
    "Your password was changed",
    "Your Xwork password was just changed and you were signed out of all devices. If this wasn't you, reset your password immediately.",
    "/settings/security"
  );

  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?password_changed=1");
}

// Saves the user's two-step verification preferences (the ⚙ dialog):
// which method to try first, and how often to verify.
export async function saveVerificationPreferences(
  method: string,
  frequency: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const m = ["authenticator", "mobile", "sms"].includes(method) ? method : null;
  const f = frequency === "every" ? "every" : "risky";

  const { error } = await supabase
    .from("profiles")
    .update({ twofa_preferred_method: m, twofa_frequency: f })
    .eq("id", user.id);
  if (error) return { ok: false };

  await notify(
    supabase,
    user.id,
    "security",
    "Verification preferences updated",
    "Your two-step verification preferences were changed. If this wasn't you, change your password.",
    "/settings/security"
  );
  return { ok: true };
}

// Records a two-step verification change (called by the Authenticator toggle).
export async function recordTwoFactorChange(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await notify(
    supabase,
    user.id,
    "security",
    enabled ? "Two-step verification enabled" : "Two-step verification disabled",
    enabled
      ? "Authenticator app codes are now required when you sign in. If this wasn't you, change your password."
      : "Authenticator app two-step verification was turned off. If this wasn't you, change your password and turn it back on.",
    "/settings/security"
  );
}
