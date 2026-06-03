"use server";

import { createClient } from "../../lib/supabase-server";

export async function createProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const username =
    user.email?.split("@")[0] || "user";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        username: username,
        role: "client",
      },
      {
        onConflict: "id",
      }
    )
    .select();

  console.log("DATA:", data);
  console.log("ERROR:", error);
}