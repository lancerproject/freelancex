"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { wizardResumePath } from "@/lib/wizard";
import { preAuthGuard, postLoginChecks } from "@/lib/security/guard";
import { statusBlockMessage } from "@/lib/security/suspend";

export async function loginWithGoogle(formData?: FormData) {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // If the user clicked "Continue with Google" on a sign-up page, remember the
  // role they picked so their new profile is created as client/freelancer.
  const role = formData?.get("role");
  if (role === "client" || role === "freelancer") {
    const cookieStore = await cookies();
    cookieStore.set("xwork_signup_role", role, {
      maxAge: 600,
      path: "/",
    });
  }

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (data.url) {
    redirect(data.url);
  }
}

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Security: blacklisted IP / disposable email are blocked before we auth.
  const pre = await preAuthGuard(email);
  if (pre.blocked) {
    redirect(`/login?error=${encodeURIComponent(pre.message || "Access denied.")}`);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // If they were partway through creating their profile, drop them back there.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, profile_step, closed, account_status")
      .eq("id", user.id)
      .maybeSingle();

    // A closed (deactivated) account can't sign back in.
    if (profile?.closed) {
      await supabase.auth.signOut();
      redirect("/login?closed=1");
    }

    // Block an already suspended/flagged account right away — this is a fast
    // DB read, no third-party calls, so it doesn't slow down normal logins.
    const status = profile?.account_status;
    if (
      status === "suspended" ||
      status === "permanently_suspended" ||
      status === "flagged"
    ) {
      await supabase.auth.signOut();
      redirect(`/login?error=${encodeURIComponent(statusBlockMessage(status))}`);
    }

    // Log the sign-in + run IP/VPN/abuse intelligence AFTER the response is
    // sent, so the user isn't kept waiting on third-party APIs ("verifying…").
    // Anything it flags/suspends still takes effect and is enforced on the very
    // next request by the proxy.
    const uid = user.id;
    after(async () => {
      try {
        await postLoginChecks(uid, status);
      } catch {
        /* best-effort background security logging */
      }
    });

    const resume = wizardResumePath(profile);
    if (resume) redirect(resume);
  }

  redirect("/dashboard");
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim();
  if (email) {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });
  }
  redirect("/login?reset=sent");
}