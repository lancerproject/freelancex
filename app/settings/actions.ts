"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const first = ((formData.get("first_name") as string) || "").trim();
  const last = ((formData.get("last_name") as string) || "").trim();
  const full_name = [first, last].filter(Boolean).join(" ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { full_name };

  // Handle photo upload (only if a new file was chosen)
  const file = formData.get("avatar_file") as File | null;
  if (file && typeof file !== "string" && file.size > 0) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("project-files")
      .upload(path, bytes, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (!upErr) {
      const { data: pub } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);
      update.avatar_url = pub.publicUrl;
    } else {
      console.error("AVATAR UPLOAD ERROR:", upErr);
    }
  }

  await supabase.from("profiles").update(update).eq("id", user.id);

  // Email change → Supabase sends a confirmation link to the NEW address.
  const newEmail = ((formData.get("email") as string) || "").trim();
  if (newEmail && newEmail.toLowerCase() !== (user.email || "").toLowerCase()) {
    const { error: emailErr } = await supabase.auth.updateUser({
      email: newEmail,
    });
    if (!emailErr) redirect("/settings/my-info?email_sent=1");
    redirect(`/settings/my-info?emailerror=${encodeURIComponent(emailErr.message)}`);
  }

  redirect("/settings/my-info?saved=1");
}

// Step 1 of closing: email a one-time code (uses Supabase's built-in email OTP).
export async function sendCloseOtp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });
  redirect("/settings?otp=sent");
}

// Step 2: verify the OTP, then close the account.
export async function closeAccountWithOtp(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const token = ((formData.get("otp") as string) || "").trim();
  const { error } = await supabase.auth.verifyOtp({
    email: user.email,
    token,
    type: "email",
  });
  if (error) {
    redirect("/settings?otperror=1");
  }

  await supabase.from("profiles").update({ closed: true }).eq("id", user.id);
  await supabase.auth.signOut();
  redirect("/login?closed=1");
}

export async function closeAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const confirm = ((formData.get("confirm_email") as string) || "")
    .trim()
    .toLowerCase();
  if (!user.email || confirm !== user.email.toLowerCase()) {
    redirect("/settings?closeerror=1");
  }

  // Mark the profile closed (keeps the email reserved so it can't be reused)
  // and sign the user out. Full deletion + email OTP needs the email service.
  await supabase.from("profiles").update({ closed: true }).eq("id", user.id);
  await supabase.auth.signOut();
  redirect("/login?closed=1");
}

export async function updateCompanyContacts(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({
      phone: (formData.get("phone") as string) || null,
      vat_id: (formData.get("vat_id") as string) || null,
      time_zone: (formData.get("time_zone") as string) || null,
      country: (formData.get("country") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      zip: (formData.get("zip") as string) || null,
    })
    .eq("id", user.id);

  redirect("/settings/my-info?saved=1");
}

// Company details (name + logo) — the client "My info" middle card.
export async function updateCompanyDetails(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {
    company_name: ((formData.get("company_name") as string) || "").trim() || null,
  };

  // Optional logo upload (same bucket + pattern as the avatar upload).
  const file = formData.get("company_logo_file") as File | null;
  if (file && typeof file !== "string" && file.size > 0) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `company-logos/${user.id}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("project-files")
      .upload(path, bytes, {
        contentType: file.type || "image/png",
        upsert: true,
      });
    if (!upErr) {
      const { data: pub } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);
      update.company_logo = pub.publicUrl;
    } else {
      console.error("COMPANY LOGO UPLOAD ERROR:", upErr);
    }
  }

  await supabase.from("profiles").update(update).eq("id", user.id);
  redirect("/settings/my-info?saved=1");
}

// AI data preference — opt in/out of using account data to improve models.
export async function setAiPreference(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const optOut = formData.get("opt_out") === "1";
  await supabase
    .from("profiles")
    .update({ ai_data_opt_out: optOut })
    .eq("id", user.id);

  redirect("/settings/my-info?saved=1");
}
