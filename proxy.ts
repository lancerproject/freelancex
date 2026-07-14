import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy. This runs on every request and
// refreshes the Supabase auth session, rotating and persisting tokens so we
// don't get "Invalid Refresh Token: Already Used" errors.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touch the session so expired access tokens get refreshed here, where we
  // can write the new cookies back to the browser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Account-status enforcement: a suspended/flagged user must not be able to
  // use an existing session on ANY route. Wrapped so a failure here can never
  // break the whole site — on any error we simply allow the request through.
  if (user) {
    const path = request.nextUrl.pathname;
    const PUBLIC = [
      "/suspended",
      "/login",
      "/register",
      "/auth",
      "/reset-password",
      "/forgot-password",
      "/welcome",
      "/verify-email",
      "/verified",
    ];
    const skip =
      path.startsWith("/_next") ||
      PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
    if (!skip) {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("account_status, last_active_at, role")
          .eq("id", user.id)
          .maybeSingle();
        const s = prof?.account_status;
        if (s === "suspended" || s === "permanently_suspended" || s === "flagged") {
          const url = request.nextUrl.clone();
          url.pathname = "/suspended";
          url.search = `?s=${s}`;
          return NextResponse.redirect(url);
        }

        // Role separation: a client must never land on a freelancer-only area
        // (and vice-versa). Guarded centrally so it holds for EVERY page — a
        // mismatch bounces to /dashboard, which renders the correct home.
        // Matches only exact route or sub-path (so "/freelancer" never catches
        // the shared "/freelancers" talent directory).
        const role = prof?.role;
        const underOneOf = (prefixes: string[]) =>
          prefixes.some((p) => path === p || path.startsWith(p + "/"));
        const FREELANCER_ONLY = [
          "/create-profile",
          "/freelancer",
          "/stats",
          "/badges",
          "/job-success",
          "/finances",
          "/transactions",
          "/withdraw",
        ];
        const CLIENT_ONLY = ["/jobs/new", "/talent/hires"];
        if (
          (role === "client" && underOneOf(FREELANCER_ONLY)) ||
          (role === "freelancer" && underOneOf(CLIENT_ONLY))
        ) {
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          url.search = "";
          return NextResponse.redirect(url);
        }

        // Track activity (throttled to ~15 min) so proposal insights can show
        // "client last active X ago" and the inactivity cron knows who's idle.
        const last = prof?.last_active_at
          ? new Date(prof.last_active_at).getTime()
          : 0;
        if (Date.now() - last > 15 * 60 * 1000) {
          await supabase
            .from("profiles")
            .update({ last_active_at: new Date().toISOString() })
            .eq("id", user.id);
        }
      } catch {
        /* never block the site on a status-check failure */
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
