"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export async function loginWithGoogle() {
  const supabase = await createClient();

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "http://localhost:3000/auth/callback",
    },
  });

  if (data.url) {
    redirect(data.url);
  }
}