"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function toggleSaveTalent(talentId: string, redirectTo: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("saved_talent")
    .select("id")
    .eq("user_id", user.id)
    .eq("talent_id", talentId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_talent").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("saved_talent")
      .insert({ user_id: user.id, talent_id: talentId });
  }

  redirect(redirectTo);
}
