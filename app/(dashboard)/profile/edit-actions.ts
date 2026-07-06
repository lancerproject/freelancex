"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
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

const SCALAR_FIELDS = [
  "full_name",
  "title",
  "bio",
  "skills",
  "working_style",
  "location",
  "website",
  "availability_pref",
  "avg_response",
  "hours_per_week",
  "job_preference",
  "avatar_url",
  "video_url",
];

const JSON_FIELDS = [
  "portfolio",
  "certifications",
  "employment",
  "other_experiences",
  "services",
  "languages",
  "education",
  "licenses",
];

// Partial update: only writes the fields that are present in this form,
// so each inline section editor can save independently without wiping others.
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {};

  for (const key of SCALAR_FIELDS) {
    if (formData.has(key)) update[key] = (formData.get(key) as string) ?? "";
  }

  if (formData.has("hourly_rate")) {
    const v = formData.get("hourly_rate");
    update.hourly_rate = v ? Number(v) : null;
  }

  for (const key of JSON_FIELDS) {
    if (formData.has(key)) update[key] = parseJson(formData.get(key));
  }

  // Optional avatar upload
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

  if (Object.keys(update).length > 0) {
    await supabase.from("profiles").update(update).eq("id", user.id);
  }

  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
