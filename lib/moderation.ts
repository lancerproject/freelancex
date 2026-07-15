import { notify } from "./notify";
import { createAdminClient } from "./supabase-admin";

// Xwork keeps conversations and payments on-platform so payment protection and
// support actually work. This module detects attempts to move off-platform
// (sharing contact details, external links, or arranging outside payment) and
// runs a 5-strike policy: 5 warnings → permanent suspension.

export const WARNING_LIMIT = 5;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Obfuscated emails: "john (at) gmail (dot) com", "john[at]gmail[dot]com",
// "john at gmail dot com".
const EMAIL_OBFUSCATED_RE =
  /\b[\w.-]{2,}\s*[([{]?\s*(?:at|@)\s*[)\]}]?\s*[\w-]{2,}\s*[([{]?\s*(?:dot|\.)\s*[)\]}]?\s*(?:com|net|org|io|co|me|info|dev|pk|in|uk|us)\b/i;
// 9+ digits, allowing spaces / dashes / dots / parens between them.
const PHONE_RE = /(?:\+?\d[\s().-]?){9,}\d/;
// Phone numbers spelled out in words: 6+ digit-words in a row
// ("zero three one five five five …").
const DIGIT_WORDS_RE =
  /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s,.-]+){5,}(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b/i;
const URL_RE = /(https?:\/\/|www\.)\S+/i;

// Outside-payment keywords — soliciting or offering payment off Xwork.
// This is the most serious category.
const PAYMENT_KEYWORDS = [
  "paypal",
  "pay pal",
  "venmo",
  "cash app",
  "cashapp",
  "zelle",
  "western union",
  "moneygram",
  "money gram",
  "bank transfer",
  "wire transfer",
  "bank account",
  "iban",
  "swift code",
  "payoneer",
  "transferwise",
  "wise account",
  "skrill",
  "remitly",
  "jazzcash",
  "jazz cash",
  "easypaisa",
  "easy paisa",
  "sadapay",
  "nayapay",
  "bitcoin",
  "btc",
  "usdt",
  "binance",
  "gift card",
  "pay directly",
  "pay outside",
  "pay you outside",
  "pay me outside",
  "direct payment",
  "pay off the platform",
  "payment outside",
  "money outside",
  "send money",
  "avoid the fee",
  "avoid fees",
  "skip the fee",
  "without the platform",
];

// Contact / off-platform-chat keywords.
const CONTACT_KEYWORDS = [
  "whatsapp",
  "whats app",
  "telegram",
  "skype",
  "signal app",
  "discord",
  "snapchat",
  "wechat",
  "we chat",
  "viber",
  "imo number",
  "facebook",
  "messenger",
  "instagram",
  "insta dm",
  "zoom call",
  "google meet",
  "anydesk",
  "teamviewer",
  "gmail",
  "hotmail",
  "yahoo",
  "icloud",
  "outlook.com",
  "protonmail",
  "email me",
  "mail me",
  "e-mail me",
  "call me",
  "text me",
  "my number",
  "phone number",
  "mobile number",
  "contact me at",
  "reach me at",
  "reach me on",
  "add me on",
  "dm me on",
  "message me on",
  "find me on",
  "chat outside",
  "talk outside",
  "off platform",
  "off-platform",
  "outside xwork",
  "outside the platform",
  "outside of the platform",
];

// Compact-token check: catches "p a y p a l", "pay-pal", "what's_app" and
// similar spacing/punctuation tricks by stripping everything but letters and
// digits before matching.
// Distinctive brand tokens only — generic phrases stay in the spaced keyword
// lists above so ordinary sentences ("text messages", "call meetings") never
// false-positive here.
const COMPACT_PAYMENT = [
  "paypal",
  "cashapp",
  "westernunion",
  "moneygram",
  "banktransfer",
  "wiretransfer",
  "payoneer",
  "transferwise",
  "jazzcash",
  "easypaisa",
  "sadapay",
  "nayapay",
  "binance",
  "bitcoin",
];
const COMPACT_CONTACT = [
  "whatsapp",
  "telegram",
  "snapchat",
  "wechat",
  "outsidexwork",
];

export type DetectionCategory = "payment" | "contact";
export type Detection = {
  flagged: boolean;
  reason: string;
  category: DetectionCategory;
};

const CLEAN: Detection = { flagged: false, reason: "", category: "contact" };

// Whole-word/phrase match — "text me" must NOT match inside "text messages".
function hasKeyword(t: string, k: string): boolean {
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(t);
}

export function detectOffPlatform(text: string): Detection {
  const raw = text || "";
  const t = ` ${raw.toLowerCase().replace(/\s+/g, " ")} `;
  // Letters/digits only — defeats spacing and punctuation tricks.
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");

  for (const k of COMPACT_PAYMENT) {
    if (compact.includes(k)) {
      return {
        flagged: true,
        reason:
          "Asking for or offering payment outside Xwork isn't allowed — it's a serious violation of our Terms of Service.",
        category: "payment",
      };
    }
  }
  for (const k of COMPACT_CONTACT) {
    if (compact.includes(k)) {
      return {
        flagged: true,
        reason: "Arranging contact off Xwork isn't allowed.",
        category: "contact",
      };
    }
  }

  // Outside payment first — it's the most serious violation.
  for (const k of PAYMENT_KEYWORDS) {
    if (hasKeyword(t, k)) {
      return {
        flagged: true,
        reason:
          "Asking for or offering payment outside Xwork isn't allowed — it's a serious violation of our Terms of Service.",
        category: "payment",
      };
    }
  }
  if (EMAIL_RE.test(raw) || EMAIL_OBFUSCATED_RE.test(raw)) {
    return {
      flagged: true,
      reason: "Sharing email addresses isn't allowed.",
      category: "contact",
    };
  }
  if (URL_RE.test(raw)) {
    return {
      flagged: true,
      reason: "Sharing external links isn't allowed.",
      category: "contact",
    };
  }
  if (PHONE_RE.test(raw) || DIGIT_WORDS_RE.test(raw)) {
    return {
      flagged: true,
      reason: "Sharing phone numbers isn't allowed.",
      category: "contact",
    };
  }
  for (const k of CONTACT_KEYWORDS) {
    if (hasKeyword(t, k)) {
      return {
        flagged: true,
        reason: "Arranging contact off Xwork isn't allowed.",
        category: "contact",
      };
    }
  }
  return CLEAN;
}

export type WarningResult = {
  warnings: number;
  suspended: boolean;
  justSuspended: boolean;
};

// Records a policy warning for a user. On the 5th warning the account is
// permanently suspended. Sends an in-app notification (and an email, once
// email is configured) at every step. When `category` is given, the attempt is
// also recorded as a violation on the account-health score — outside-payment
// solicitation and contact-sharing are serious violations, not just warnings.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordWarning(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  reason: string,
  category?: DetectionCategory
): Promise<WarningResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("warnings, suspended")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.suspended) {
    return { warnings: profile.warnings ?? WARNING_LIMIT, suspended: true, justSuspended: false };
  }

  const next = (profile?.warnings ?? 0) + 1;

  // warnings/suspended/account_status are privileged columns (a DB trigger
  // blocks user-client writes so nobody can clear their own warnings). Write
  // them through the service-role client.
  const admin = createAdminClient();

  // Account health: every blocked attempt is a recorded violation.
  //   payment → soliciting_outside_platform (critical), contact → contact_info_shared.
  // Best-effort — a health hiccup must never stop the block/warning itself.
  if (category) {
    try {
      const { addViolation } = await import("./health");
      await addViolation({
        userId,
        type:
          category === "payment"
            ? "soliciting_outside_platform"
            : "contact_info_shared",
        description: `${reason} The message was blocked and not delivered.`,
        metadata: { source: "message_scanner", warning: next },
      });
    } catch {
      /* best-effort */
    }
  }

  if (next >= WARNING_LIMIT) {
    const suspensionReason =
      `Suspended after ${WARNING_LIMIT} policy warnings for attempting to share contact details or arrange payment off Xwork.`;
    await admin
      .from("profiles")
      .update({
        warnings: next,
        suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: suspensionReason,
        // Enforced site-wide by the proxy and by the health hard cap.
        account_status: "permanently_suspended",
      })
      .eq("id", userId);

    // Recalculate health under the new status (forces the score to 0).
    try {
      const { recalcHealth } = await import("./health");
      await recalcHealth(userId, "five_strike_suspension");
    } catch {
      /* best-effort */
    }

    // Free this person's verified identity so they may verify a new account
    // (subject to the lifetime cap enforced in claim_identity).
    await supabase.rpc("release_identity", { p_user_id: userId });

    await notify(
      supabase,
      userId,
      "account",
      "Your Xwork account has been suspended",
      `Your account has been permanently suspended after ${WARNING_LIMIT} policy warnings for trying to take contact or payments off Xwork. Keeping everything on Xwork is what makes payment protection and support possible. If you believe this was a mistake, please contact our support team.`,
      "/profile"
    );

    return { warnings: next, suspended: true, justSuspended: true };
  }

  await admin.from("profiles").update({ warnings: next }).eq("id", userId);

  await notify(
    supabase,
    userId,
    "warning",
    `Policy warning ${next} of ${WARNING_LIMIT}`,
    `${reason} Please keep all chat and payments on Xwork — it's how we protect your payments and can support you. After ${WARNING_LIMIT} warnings your account will be permanently suspended.`,
    "/terms"
  );

  return { warnings: next, suspended: false, justSuspended: false };
}
