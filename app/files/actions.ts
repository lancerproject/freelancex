"use server";

import { createClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";

export async function uploadFile(
  contractId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const file = formData.get("file") as File;

  if (!file) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const filePath = `${user.id}/${contractId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(filePath, file, {
      contentType: file.type,
    });

  if (uploadError) {
    return;
  }

  await supabase.from("contract_files").insert({
    contract_id: contractId,
    uploaded_by: user.id,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
  });

  redirect(`/contracts/${contractId}`);
}

export async function deleteFile(
  fileId: string,
  filePath: string,
  contractId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.storage
    .from("project-files")
    .remove([filePath]);

  await supabase
    .from("contract_files")
    .delete()
    .eq("id", fileId);

  redirect(`/contracts/${contractId}`);
}
