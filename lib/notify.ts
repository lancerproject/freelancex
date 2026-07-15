import { sendEmail } from "./email";
import { isAllowed } from "./notification-prefs";
import { createAdminClient } from "./supabase-admin";

// Creates an in-app notification AND sends an email — each subject to the
// recipient's notification preferences (Settings → Notifications). If prefs
// haven't been set, sensible defaults apply (most on, marketing off).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notify(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string | null | undefined,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  if (!userId) return;

  // Load the recipient's email + preferences in one go. If the column doesn't
  // exist yet (pre-migration) this just yields nulls → defaults apply.
  let email: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prefs: any = null;
  try {
    const { data: recipient } = await supabase
      .from("profiles")
      .select("email, notification_prefs")
      .eq("id", userId)
      .maybeSingle();
    email = recipient?.email ?? null;
    prefs = recipient?.notification_prefs ?? null;
  } catch {
    /* fall back to defaults */
  }

  // In-app notification (respects the in-app channel preference). Chat messages
  // are intentionally NOT added to the notification bell — they live in the
  // Messages inbox (with its own unread count), like Upwork. The email below
  // still goes out if the recipient allows message emails.
  if (type !== "message" && isAllowed(prefs, type, "inapp")) {
    // Insert through the service-role client. A notification is frequently
    // created FOR another user (e.g. "someone messaged you"), so this can't be
    // owner-scoped — using the admin client lets us drop the permissive
    // "anyone can insert" RLS policy (Security Advisor "RLS Policy Always True")
    // while keeping cross-user notifications working and un-forgeable.
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      link: link ?? null,
      is_read: false,
    });
    // Surface drops (RLS, missing column, constraint) instead of failing silent.
    if (error) console.error("notify(): in-app insert failed:", error.message);
  }

  // Best-effort email (respects the email channel preference). Silently skips
  // if email isn't configured (no RESEND_API_KEY).
  try {
    if (email && isAllowed(prefs, type, "email")) {
      await sendEmail({
        to: email,
        subject: title,
        heading: title,
        body: message,
        ctaLabel: link ? "View on Xwork" : undefined,
        ctaUrl: link,
      });
    }
  } catch {
    // never block the in-app notification on email
  }
}
