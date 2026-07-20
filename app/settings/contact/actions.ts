"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notify } from "@/lib/notify";
import { loadOwnProfile } from "@/lib/own-profile";
import { createHash, randomInt } from "crypto";

// Updates the Account fields: first/last name, and (optionally) email.
// Changing the email triggers Supabase to send a verification link to the new
// address; the change only takes effect after the user confirms it.
export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const first = String(formData.get("first_name") || "").trim();
  const last = String(formData.get("last_name") || "").trim();
  const full_name = [first, last].filter(Boolean).join(" ").trim();
  const newEmail = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const { error: nameErr } = await supabase
    .from("profiles")
    .update({ full_name: full_name || null })
    .eq("id", user.id);
  // Surface a failed write instead of falsely reporting "saved".
  if (nameErr) {
    redirect("/settings/contact?error=save");
  }

  let emailPending = false;
  if (newEmail && newEmail !== (user.email || "").toLowerCase()) {
    // Supabase emails a confirmation link to the new address. Login email
    // updates only once the user clicks it.
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      // e.g. email already in use / rate-limited — tell the user.
      redirect("/settings/contact?error=email");
    }
    emailPending = true;
  }

  // Account-activity notification (in-app + email).
  await notify(
    supabase,
    user.id,
    "account",
    "Account details updated",
    emailPending
      ? "Your name was updated and we sent a verification link to your new email address. If this wasn't you, change your password right away."
      : "Your account details were updated. If this wasn't you, change your password right away.",
    "/settings/contact"
  );

  revalidatePath("/settings/contact");
  redirect(
    `/settings/contact?saved=1${emailPending ? "&email_pending=1" : ""}`
  );
}

// Updates the Location fields (time zone, address, phone).
export async function updateLocation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const timezone = String(formData.get("timezone") || "").trim();
  const country = String(formData.get("country") || "").trim();
  const address1 = String(formData.get("address1") || "").trim();
  const address2 = String(formData.get("address2") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const postal_code = String(formData.get("postal_code") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  // Keep the freeform "location" (shown on the public profile) in sync — only
  // city and country are ever shared publicly.
  const location = [city, country].filter(Boolean).join(", ");

  // A changed phone number loses its verified status until re-verified.
  const { data: before } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();
  const phoneChanged = (before?.phone || "") !== phone;

  const { error } = await supabase
    .from("profiles")
    .update({
      timezone: timezone || null,
      country: country || null,
      address1: address1 || null,
      address2: address2 || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      phone: phone || null,
      location: location || null,
      ...(phoneChanged
        ? { phone_verified_at: null, phone_otp_hash: null, phone_otp_expires: null }
        : {}),
    })
    .eq("id", user.id);

  // Surface failures instead of silently "saving" nothing (this is what made
  // the time zone appear to never save — a missing column rejected the write).
  if (error) {
    redirect("/settings/contact?error=save");
  }

  await notify(
    supabase,
    user.id,
    "account",
    "Location updated",
    "Your location and contact details were updated.",
    "/settings/contact"
  );

  revalidatePath("/settings/contact");
  redirect("/settings/contact?saved=1");
}

// ---------------------------------------------------------------------------
// Phone verification (OTP). The code is hashed at rest and expires after 10
// minutes. Delivery: real SMS when Twilio keys are in .env; until then the
// code arrives as an Xwork notification + email, so the flow works end to end
// and switches to SMS the moment keys are added.
// ---------------------------------------------------------------------------

function hashCode(code: string): string {
  return createHash("sha256").update(`xwork-phone:${code}`).digest("hex");
}

export async function sendPhoneCode(): Promise<{
  ok: boolean;
  error?: string;
  via?: "sms" | "notification";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();
  const phone = (me?.phone || "").trim();
  if (!phone) {
    return { ok: false, error: "Add your phone number first, then verify it." };
  }

  const code = String(randomInt(100000, 1000000)); // 6 digits
  const { error } = await supabase
    .from("profiles")
    .update({
      phone_otp_hash: hashCode(code),
      phone_otp_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    return { ok: false, error: "Couldn't start verification. Please try again." };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (sid && token && from) {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: from,
            Body: `Your Xwork phone verification code is ${code}. It expires in 10 minutes.`,
          }),
        }
      );
      if (res.ok) return { ok: true, via: "sms" };
    } catch {
      /* fall through to notification delivery */
    }
  }

  // No SMS provider yet — deliver via notification + email instead.
  await notify(
    supabase,
    user.id,
    "account",
    "Phone verification code",
    `Your Xwork phone verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore it.`,
    "/settings/contact"
  );
  return { ok: true, via: "notification" };
}

export async function confirmPhoneCode(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const clean = (code || "").replace(/\D/g, "");
  if (clean.length !== 6) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  const me = await loadOwnProfile(user.id);
  if (!me?.phone_otp_hash || !me?.phone_otp_expires) {
    return { ok: false, error: "Request a new code first." };
  }
  if (new Date(me.phone_otp_expires).getTime() < Date.now()) {
    return { ok: false, error: "That code expired — request a new one." };
  }
  if (hashCode(clean) !== me.phone_otp_hash) {
    return { ok: false, error: "That code isn't right. Double-check and try again." };
  }

  await supabase
    .from("profiles")
    .update({
      phone_verified_at: new Date().toISOString(),
      phone_otp_hash: null,
      phone_otp_expires: null,
    })
    .eq("id", user.id);

  await notify(
    supabase,
    user.id,
    "account",
    "Phone number verified ✓",
    "Your phone number is now verified on your Xwork account.",
    "/settings/contact"
  );
  revalidatePath("/settings/contact");
  return { ok: true };
}
