"use server";

import { createClient } from "@/lib/supabase-server";

// Uploads a single file to the project-files bucket and returns its public URL.
// Used by the drag-and-drop photo / portfolio / video uploaders.
export async function uploadToStorage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "No file selected." };
  }
  // 50 MB ceiling (covers short intro videos and images).
  if (file.size > 50 * 1024 * 1024) {
    return { error: "File is too large (max 50 MB)." };
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const rand = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `uploads/${user.id}/${rand}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("project-files")
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) return { error: error.message };

  const { data: pub } = supabase.storage
    .from("project-files")
    .getPublicUrl(path);
  return { url: pub.publicUrl };
}
