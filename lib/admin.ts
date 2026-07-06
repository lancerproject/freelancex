import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Gate for the admin / trust-&-safety console. Only profiles with is_admin=true
// may pass; everyone else is sent back to their dashboard.
export async function requireAdmin() {
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
  return { supabase, user };
}

// Lightweight check (no redirect) — used to decide whether to show an Admin link.
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return !!data?.is_admin;
}
