"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Saves the current job search (query + filters) so it can power "My Feed".
export async function saveSearch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = (formData.get("q") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const experience_level =
    (formData.get("experience_level") as string)?.trim() || null;
  const minRaw = (formData.get("min_budget") as string)?.trim();
  const min_budget = minRaw ? Number(minRaw) : null;

  // Need at least one criterion to be a meaningful saved search.
  if (!query && !category && !experience_level && !min_budget) {
    redirect("/jobs?saved=empty");
  }

  await supabase.from("saved_searches").insert({
    user_id: user.id,
    query,
    category,
    experience_level,
    min_budget,
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");

  // Keep the user on their current search, with a "saved" confirmation.
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (experience_level) params.set("experience_level", experience_level);
  if (min_budget) params.set("min_budget", String(min_budget));
  params.set("saved", "1");
  redirect(`/jobs?${params.toString()}`);
}

export async function deleteSavedSearch(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect("/jobs");
}
