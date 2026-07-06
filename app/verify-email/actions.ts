"use server";

import { createClient } from "@/lib/supabase-server";

export async function resendVerification(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  if (!email) return { ok: false, error: "No email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
