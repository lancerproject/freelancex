// Sends transactional emails via Resend's HTTP API.
// No-ops safely if RESEND_API_KEY isn't set, so the app never breaks when
// email isn't configured yet. Uses fetch (no extra dependency).

export async function sendEmail({
  to,
  subject,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return; // email not configured — skip quietly

  const from = process.env.EMAIL_FROM || "Xwork <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullUrl =
    ctaUrl && ctaUrl.startsWith("http") ? ctaUrl : `${appUrl}${ctaUrl ?? ""}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717">
      <div style="font-size:22px;font-weight:bold;margin-bottom:16px">
        <span style="color:#9333ea">X</span><span style="color:#171717">work</span>
      </div>
      <h1 style="font-size:18px;margin:0 0 8px">${heading}</h1>
      <p style="font-size:14px;line-height:1.6;color:#404040">${body}</p>
      ${
        ctaLabel
          ? `<a href="${fullUrl}" style="display:inline-block;margin-top:16px;background:#9333ea;color:#fff;text-decoration:none;padding:10px 20px;border-radius:9999px;font-size:14px;font-weight:600">${ctaLabel}</a>`
          : ""
      }
      <p style="font-size:12px;color:#a3a3a3;margin-top:28px">You're receiving this because you have an Xwork account.</p>
    </div>`;

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
