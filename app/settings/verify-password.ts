"use server";

import { createClient } from "@/lib/supabase-server";

// Verifies the signed-in user's account password. Used to gate every settings
// change behind a password confirmation. Returns { ok } without mutating
// anything — the real save runs only after this resolves ok on the client.
export async function verifyPassword(
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "You're not signed in." };

  if (!password) return { ok: false, error: "Enter your password." };

  // The only reliable way to check a password with Supabase is to attempt a
  // sign-in with it. This refreshes the current user's session tokens as a
  // side effect (same user, so not a security concern) and tells us whether
  // the password was correct.
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error) return { ok: false, error: "Incorrect password. Please try again." };
  return { ok: true };
}

// Masked account email for the "Enter your current password" prompt
// (e.g. h******29@gmail.com), so the user can confirm which account they're in.
export async function getMaskedEmail(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email || "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const end = local.length > 2 ? local.slice(-2) : "";
  return `${local[0] ?? ""}******${end}@${domain}`;
}

// Sends a password-reset link to the signed-in user's email — backs the
// "Forgot password?" link inside the password prompt.
export async function sendPasswordReset(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false };
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  return { ok: true };
}
