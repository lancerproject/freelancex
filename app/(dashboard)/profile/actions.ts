"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJson(raw: FormDataEntryValue | null): any[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {
    full_name: formData.get("full_name") as string,
    title: formData.get("title") as string,
    bio: formData.get("bio") as string,
    skills: formData.get("skills") as string,
    working_style: formData.get("working_style") as string,
    languages: formData.get("languages") as string,
    education: formData.get("education") as string,
    location: formData.get("location") as string,
    website: formData.get("website") as string,
    availability_pref: formData.get("availability_pref") as string,
    avg_response: formData.get("avg_response") as string,
    hourly_rate: formData.get("hourly_rate")
      ? Number(formData.get("hourly_rate"))
      : null,
    portfolio: parseJson(formData.get("portfolio")),
    certifications: parseJson(formData.get("certifications")),
    employment: parseJson(formData.get("employment")),
    other_experiences: parseJson(formData.get("other_experiences")),
  };

  const file = formData.get("avatar_file") as File | null;
  if (file && typeof file !== "string" && file.size > 0) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("project-files")
      .upload(path, bytes, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (!upErr) {
      const { data: pub } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);
      update.avatar_url = pub.publicUrl;
    }
  }

  await supabase.from("profiles").update(update).eq("id", user.id);
  redirect("/profile?saved=1");
}
