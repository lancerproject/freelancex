import { createClient } from "../../../../lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const formData = await request.formData();

  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json(
      { error: "No file" },
      { status: 400 }
    );
  }

  const filePath = `${user.id}/${contractId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file, {
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  await supabase.from("contract_files").insert({
    contract_id: contractId,
    uploaded_by: user.id,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
  });

  return NextResponse.redirect(
    new URL(`/contracts/${contractId}`, request.url),
    { status: 303 }
  );
}
