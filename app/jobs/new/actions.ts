"use server";

import { createClient } from "../../../lib/supabase-server";
import { redirect } from "next/navigation";

export async function createJob(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const budget = formData.get("budget");

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title,
      description,
      budget,
      client_id: user.id,
    })
    .select();

  console.log("JOB DATA:", data);
  console.log("JOB ERROR:", error);

  redirect("/dashboard");
}