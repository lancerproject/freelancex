import { createAdminClient } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { logSecurityEvent, createFraudAlert } from "./store";
import { addViolation, recalcHealth, type ViolationType } from "@/lib/health";

// Map suspension reasons to health-system violation types. Any reason not
// listed counts as a manual/admin suspension.
const REASON_TO_VIOLATION: Record<string, ViolationType> = {
  vpn_proxy_detected: "vpn_detected",
  suspicious_ip_detected: "suspicious_ip",
  identity_country_mismatch: "country_mismatch",
};

export type SuspendStatus = "suspended" | "permanently_suspended" | "flagged";

// User-facing messages by status/reason. Deliberately vague — never reveal the
// detection details; just point them to support.
export function statusBlockMessage(status?: string | null): string {
  switch (status) {
    case "permanently_suspended":
      return "Your account has been permanently suspended for violating Xwork's Terms of Service. Contact support at support@xwork.com if you believe this is a mistake.";
    case "suspended":
      return "Your account has been suspended due to a verification issue. Contact support at support@xwork.com if you believe this is a mistake.";
    case "flagged":
      return "Your account is under review. Please contact support at support@xwork.com if you have questions.";
    default:
      return "";
  }
}

export function isBlockedStatus(status?: string | null): boolean {
  return (
    status === "suspended" ||
    status === "permanently_suspended" ||
    status === "flagged"
  );
}

// Suspend (never delete) an account: update status, log it, raise a fraud
// alert for admin review, and email the user. Uses the service role so the
// write is reliable regardless of the caller's session.
export async function suspendAccount(params: {
  userId: string;
  status: SuspendStatus;
  reason: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
  ip?: string | null;
  device?: string | null;
}): Promise<void> {
  const { userId, status, reason, details, ip, device } = params;
  const admin = createAdminClient();

  // Update the profile (keep the legacy `suspended` boolean in sync so existing
  // checks like identityBlocked / per-action guards keep working).
  try {
    await admin
      .from("profiles")
      .update({
        account_status: status,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended: status !== "flagged", // "flagged" is review-only, not a block-out
      })
      .eq("id", userId);
  } catch {
    /* still log below even if the update hiccups */
  }

  await logSecurityEvent({
    userId,
    eventType: status === "flagged" ? "flag" : "suspend",
    description: reason,
    ip,
    device,
  });
  await createFraudAlert({ userId, alertType: reason, details: { ...details, status, ip } });

  // Account health: record the violation and recalculate the score. A real
  // suspension (not "flagged") also hard-caps the score via account_status.
  try {
    if (status !== "flagged") {
      await addViolation({
        userId,
        type: REASON_TO_VIOLATION[reason] ?? "admin_suspension",
        metadata: { ...details, reason, ip: ip ?? null },
      });
    } else {
      await recalcHealth(userId, `flagged:${reason}`);
    }
  } catch {
    /* health update is best-effort — never block a suspension */
  }

  // Email the user (best-effort; no-ops if email isn't configured).
  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const to = prof?.email;
    if (to && status !== "flagged") {
      await sendEmail({
        to,
        subject:
          status === "permanently_suspended"
            ? "Your Xwork account has been permanently suspended"
            : "Your Xwork account has been suspended",
        heading: "Account suspended",
        body: statusBlockMessage(status),
        ctaLabel: "Contact support",
        ctaUrl: "mailto:support@xwork.com",
      });
    }
  } catch {
    /* never block on email */
  }
}
