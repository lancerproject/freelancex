// Sends transactional emails via Resend's HTTP API.
// No-ops safely if RESEND_API_KEY isn't set, so the app never breaks when
// email isn't configured yet. Uses fetch (no extra dependency).
//
// The HTML is built from per-event templates (lib/email-templates.ts): each
// notification `type` gets its own badge, accent, and default CTA label.

import { renderEmail } from "./email-templates";

export async function sendEmail({
  to,
  subject,
  heading,
  body,
  ctaLabel,
  ctaUrl,
  type,
  preheader,
}: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  // Notification type ("message", "payment", "account", …) — selects the
  // template's badge/accent/CTA. Omitted → generic "Notification" styling.
  type?: string;
  // Optional hidden preview text; falls back to the body.
  preheader?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return; // email not configured — skip quietly

  const from = process.env.EMAIL_FROM || "Xwork <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Root-relative paths ("/jobs/123") get the app URL prepended; absolute URLs
  // and other schemes (http…, mailto:, tel:) pass through unchanged.
  const fullUrl = ctaUrl
    ? ctaUrl.startsWith("/")
      ? `${appUrl}${ctaUrl}`
      : ctaUrl
    : undefined;

  const html = renderEmail({
    type,
    heading,
    body,
    ctaLabel,
    ctaUrl: fullUrl,
    preheader,
    appUrl,
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
      // Never let a slow/hanging email provider block a save (e.g. the tax form
      // sitting on "Saving…"). Abort after a few seconds.
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    // Never let email failures break the app flow.
  }
}
