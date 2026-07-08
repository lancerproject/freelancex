import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Behind a proxy (Render/Vercel) `request.url`'s origin can resolve to an
  // internal host like http://localhost:PORT, which would redirect the user to
  // localhost after email confirmation. Prefer the configured public URL, then
  // the forwarded host, and only fall back to the request origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin)
  ).replace(/\/$/, "");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  // Email-confirmation links pass ?next=/verified to show the congrats screen.
  const dest = next && next.startsWith("/") ? `${baseUrl}${next}` : baseUrl;
  return NextResponse.redirect(dest);
}