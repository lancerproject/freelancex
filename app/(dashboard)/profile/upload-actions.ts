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

// Uploads a sensitive identity-verification image to the PRIVATE
// `id-verifications` bucket and returns its storage PATH (not a public URL —
// there isn't one). Admins later view it via a short-lived signed URL. The
// path is namespaced by user id so the bucket's RLS lets only the owner (and
// the service role) touch it.
export async function uploadIdDoc(
  formData: FormData
): Promise<{ path?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "No file selected." };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { error: "File is too large (max 25 MB)." };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const rand = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Preferred: private bucket, return the storage PATH.
  const path = `${user.id}/${rand}.${ext}`;
  const { error } = await supabase.storage
    .from("id-verifications")
    .upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (!error) return { path };

  // Fallback (before the id-verifications bucket migration is applied): use the
  // existing bucket so verification still works. The admin page treats a full
  // URL as a pass-through. Once the migration runs, uploads go private.
  const pubPath = `uploads/${user.id}/${rand}.${ext}`;
  const { error: e2 } = await supabase.storage
    .from("project-files")
    .upload(pubPath, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (e2) return { error: e2.message };
  const { data: pub } = supabase.storage
    .from("project-files")
    .getPublicUrl(pubPath);
  return { path: pub.publicUrl };
}
