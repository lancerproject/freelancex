"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Set the account's role when it's missing/invalid (e.g. an older account, or
// a social sign-up where the chosen role was lost). Only ever sets a role that
// isn't already a valid one — it never flips an existing client↔freelancer.
export async function setRole(role: "freelancer" | "client") {
  if (role !== "freelancer" && role !== "client") redirect("/select-role");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Guard: if a valid role is already set, don't change it — just move on.
  if (profile?.role === "freelancer" || profile?.role === "client") {
    redirect("/dashboard");
  }

  await supabase.from("profiles").update({ role }).eq("id", user.id);
  redirect("/dashboard");
}
