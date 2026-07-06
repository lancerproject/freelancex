"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { preAuthGuard, postRegisterChecks } from "@/lib/security/guard";

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const first = (formData.get("firstname") as string) || "";
  const last = (formData.get("lastname") as string) || "";
  const fullname =
    ((formData.get("fullname") as string) || `${first} ${last}`).trim();
  const country = (formData.get("country") as string) || "";
  const timezone = (formData.get("timezone") as string) || "";
  const role = formData.get("role") as string;
  const regRole = role === "client" ? "client" : "freelancer";

  // Security: block blacklisted IPs and disposable email domains up front.
  const pre = await preAuthGuard(email);
  if (pre.blocked) {
    redirect(`/register/${regRole}?error=${encodeURIComponent(pre.message || "Access denied.")}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/verified`,
      data: {
        full_name: fullname,
        role: role,
      },
    },
  });

  if (error) {
    const safeRole = role === "freelancer" ? "freelancer" : "client";
    redirect(`/register/${safeRole}?error=${encodeURIComponent(error.message)}`);
  }

  const safeRole = role === "client" ? "client" : "freelancer";

  if (data.user) {
    // The profile row already exists (created by the signup trigger) and has a
    // NOT NULL `username`, so we UPDATE — never upsert (upsert's INSERT path
    // trips the constraint and the role would silently never save, sending the
    // user to the wrong side of the marketplace).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { full_name: fullname, role: safeRole };
    if (country) row.country = country;
    if (timezone) row.timezone = timezone;

    const { error: profileError } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", data.user.id);
    if (profileError) {
      // If an optional column doesn't exist yet, save the guaranteed ones.
      await supabase
        .from("profiles")
        .update({ full_name: fullname, role: safeRole })
        .eq("id", data.user.id);
    }

    // Security: log the registration + run IP/VPN/abuse + multi-account checks.
    // A VPN/abusive IP suspends the just-created account; block entry if so.
    const check = await postRegisterChecks(data.user.id);
    if (check.blocked) {
      await supabase.auth.signOut();
      redirect(`/login?error=${encodeURIComponent(check.message || "Access denied.")}`);
    }
  }

  // When "Confirm email" is OFF in Supabase, signUp returns an active session
  // (the user is auto-confirmed) — so we skip the "verify your email" step.
  // When it's ON, there is no session yet and we send them through verify-email.
  const confirmed = data.session ? "1" : "";

  redirect(
    `/welcome?name=${encodeURIComponent(fullname)}&email=${encodeURIComponent(
      email
    )}&role=${safeRole}${confirmed ? "&confirmed=1" : ""}`
  );
}