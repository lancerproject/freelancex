"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";

export type ContactResult = { ok: boolean; error?: string };

// Handles a Contact Us submission. Works for logged-out visitors: the insert
// runs through the service role (no client-side DB access needed), and the
// team is notified by email at info@thexwork.com.
export async function submitContactMessage(
  formData: FormData
): Promise<ContactResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  // Honeypot: real users never fill this hidden field; bots do.
  const honeypot = String(formData.get("company_website") || "").trim();
  if (honeypot) return { ok: true }; // silently drop spam

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (message.length < 10) {
    return { ok: false, error: "Please enter a message (at least 10 characters)." };
  }
  if (message.length > 5000) {
    return { ok: false, error: "Your message is too long (5,000 characters max)." };
  }

  // Attach the signed-in user's id if there is one (best-effort).
  let userId: string | null = null;
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    /* logged-out — fine */
  }

  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    name,
    email,
    subject: subject || null,
    message,
    user_id: userId,
  });
  if (error) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // Notify the team inbox. Best-effort — never fail the submission on email.
  try {
    await sendEmail({
      to: "info@thexwork.com",
      subject: `New contact message: ${subject || "General inquiry"}`,
      heading: "New contact form submission",
      body: `From ${name} (${email}):\n\n${message}`,
      type: "system",
    });
  } catch {
    /* ignore */
  }

  return { ok: true };
}
