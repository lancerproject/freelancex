"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function updatePassword(formData: FormData) {
  const password = (formData.get("password") as string) || "";
  const confirm = (formData.get("confirm") as string) || "";

  if (password.length < 8) {
    redirect("/reset-password?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }
  if (password !== confirm) {
    redirect("/reset-password?error=" + encodeURIComponent("Passwords don't match."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/reset-password?error=" + encodeURIComponent("Your reset link has expired. Request a new one."));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/reset-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/reset-password?done=1");
}
