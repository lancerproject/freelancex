"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type SaveResult = { ok: boolean; error?: string; name?: string };

// Saves the current job search (query + filters) so it can power "My Feed".
// The user names it in the "Save search as" dialog; if left blank we fall back
// to the query text, then the category, then "Any" (matching Upwork).
export async function saveSearch(formData: FormData): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const query = (formData.get("q") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const experience_level =
    (formData.get("experience_level") as string)?.trim() || null;
  const minRaw = (formData.get("min_budget") as string)?.trim();
  const min_budget = minRaw ? Number(minRaw) : null;

  // Need at least one criterion to be a meaningful saved search.
  if (!query && !category && !experience_level && !min_budget) {
    return { ok: false, error: "Add a search or a filter first." };
  }

  // Cap at 30 saved searches (Upwork parity) — oldest are not auto-removed;
  // the user manages them from My Feed.
  const { count } = await supabase
    .from("saved_searches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= 30) {
    return {
      ok: false,
      error: "You've reached the limit of 30 saved searches. Remove one first.",
    };
  }

  const name =
    ((formData.get("name") as string) || "").trim() ||
    query ||
    category ||
    "Any";

  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name,
    query,
    category,
    experience_level,
    min_budget,
  });
  if (error) return { ok: false, error: "Couldn't save your search." };

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true, name };
}

// Rename an existing saved search.
export async function renameSavedSearch(
  id: string,
  name: string
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const clean = (name || "").trim();
  if (!clean) return { ok: false, error: "Enter a name." };

  const { error } = await supabase
    .from("saved_searches")
    .update({ name: clean })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't rename this search." };

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true, name: clean };
}

export async function deleteSavedSearch(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't remove this search." };

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true };
}
