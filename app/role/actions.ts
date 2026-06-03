"use server";

import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export async function selectRole(role: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  redirect("/dashboard");
}