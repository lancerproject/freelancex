"use server";

import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

// Deliverables only — no executables/scripts/HTML (HTML on the storage origin
// could be used for phishing). Allowlist of safe extensions.
const ALLOWED_EXT = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv", "md",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tif", "tiff", "heic",
  "zip", "rar", "7z", "psd", "ai", "fig", "sketch", "xd", "eps",
  "mp3", "wav", "ogg", "mp4", "mov", "webm", "m4a", "json", "xml",
]);
function extAllowed(name: string): boolean {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ALLOWED_EXT.has(ext);
}

// Only a party to the contract may attach/remove its files.
async function assertContractParty(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  contractId: string
): Promise<boolean> {
  const { data: c } = await supabase
    .from("contracts")
    .select("client_id, freelancer_id")
    .eq("id", contractId)
    .maybeSingle();
  return !!c && (c.client_id === userId || c.freelancer_id === userId);
}

export async function uploadFile(contractId: string, formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Authorization: caller must be a party to this contract (no injecting files
  // into strangers' contract workspaces).
  if (!(await assertContractParty(supabase, user.id, contractId))) {
    redirect(`/contracts/${contractId}`);
  }

  // Size guard (storage-exhaustion / cost DoS).
  if (file.size > MAX_FILE_BYTES) redirect(`/contracts/${contractId}`);
  // Type guard — reject executables/scripts/HTML.
  if (!extAllowed(file.name || "")) redirect(`/contracts/${contractId}`);

  // Sanitize the filename so it can't manipulate the storage key (path
  // traversal via "../"): strip directory separators, keep a safe basename.
  const safeName =
    (file.name || "file").split(/[\\/]/).pop()!.replace(/[^\w.\-]+/g, "_") ||
    "file";
  const filePath = `${user.id}/${contractId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(filePath, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) return;

  await supabase.from("contract_files").insert({
    contract_id: contractId,
    uploaded_by: user.id,
    file_name: safeName,
    file_path: filePath,
    file_size: file.size,
  });

  redirect(`/contracts/${contractId}`);
}

export async function deleteFile(
  fileId: string,
  // The client-supplied path is IGNORED for the storage delete — we derive the
  // real path from the DB row after an ownership check, so a forged path can't
  // remove another user's object.
  _filePath: string,
  contractId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Load the file row and confirm the caller is a party to its contract (and,
  // preferably, the uploader). Without this, any user could delete any file /
  // dispute evidence by passing an arbitrary id + path.
  const { data: row } = await supabase
    .from("contract_files")
    .select("file_path, contract_id, uploaded_by")
    .eq("id", fileId)
    .maybeSingle();
  if (!row) redirect(`/contracts/${contractId}`);

  const isParty = await assertContractParty(supabase, user.id, row.contract_id);
  if (!isParty) redirect(`/contracts/${contractId}`);

  await supabase.storage.from("project-files").remove([row.file_path]);
  await supabase.from("contract_files").delete().eq("id", fileId);

  redirect(`/contracts/${row.contract_id}`);
}
