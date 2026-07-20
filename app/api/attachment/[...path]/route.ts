import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Authenticated gateway for PRIVATE attachments (chat / proposal / dispute /
// support files live in the private `attachments` bucket — pentest H-1).
//
// The file itself is never public. A signed-in user hits
// /api/attachment/<path>; we verify the session, mint a short-lived signed URL
// with the service role, and redirect to it. An anonymous request gets 401, so
// a leaked/guessed URL is useless without a valid Xwork session. Paths are
// random and only ever surfaced to the relevant parties (they come from DB
// rows those users can already read).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Sign in to view this file.", { status: 401 });
  }

  const key = (path || []).join("/");
  if (!key) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("attachments")
    .createSignedUrl(key, 60 * 60); // 1 hour
  if (error || !data?.signedUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  const res = NextResponse.redirect(data.signedUrl);
  // The signed URL is short-lived and per-user — don't let it sit in a shared cache.
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
