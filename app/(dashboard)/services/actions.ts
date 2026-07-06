"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function saveServices(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let services: unknown[] = [];
  const raw = formData.get("services");
  if (typeof raw === "string" && raw.trim()) {
    try {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) services = v;
    } catch {
      services = [];
    }
  }

  await supabase.from("profiles").update({ services }).eq("id", user.id);
  redirect("/services?saved=1");
}
