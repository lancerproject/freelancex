// Per-event email presentation. Every transactional email flows through one
// polished HTML shell, but each notification TYPE gets its own badge, accent,
// and default call-to-action label — so a "new message" email reads differently
// from a "payment released" or "security alert" email, like a real marketplace.
//
// Brand rule: Xwork is PURPLE. Never green (Upwork's colour). All accents here
// stay in the purple family; only the semantic ones (money = teal-ish, security
// = amber, dispute = red) differ, and none of them is green.

export type EventMeta = {
  emoji: string;
  badge: string; // short label shown in the pill
  accent: string; // hex used for the CTA button + badge text
  accentBg: string; // faint background for the badge pill
  cta: string; // default call-to-action label when a link is present
};

const BRAND = "#9333ea"; // Xwork purple
const BRAND_BG = "#f5f0ff";

const EVENTS: Record<string, EventMeta> = {
  message: {
    emoji: "💬",
    badge: "New message",
    accent: BRAND,
    accentBg: BRAND_BG,
    cta: "Open conversation",
  },
  proposal: {
    emoji: "📄",
    badge: "Proposal",
    accent: BRAND,
    accentBg: BRAND_BG,
    cta: "View proposal",
  },
  invite: {
    emoji: "✉️",
    badge: "Invitation",
    accent: BRAND,
    accentBg: BRAND_BG,
    cta: "View invitation",
  },
  job_alert: {
    emoji: "🔔",
    badge: "Job match",
    accent: BRAND,
    accentBg: BRAND_BG,
    cta: "View job",
  },
  contract: {
    emoji: "📑",
    badge: "Contract",
    accent: BRAND,
    accentBg: BRAND_BG,
    cta: "View contract",
  },
  payment: {
    emoji: "💰",
    badge: "Payment",
    accent: "#0d9488", // teal — money (not green)
    accentBg: "#effcf9",
    cta: "View payment",
  },
  review: {
    emoji: "⭐",
    badge: "Feedback",
    accent: "#d97706", // amber
    accentBg: "#fffaf0",
    cta: "View feedback",
  },
  account: {
    emoji: "🔒",
    badge: "Account & security",
    accent: "#dc2626", // red — security matters
    accentBg: "#fef2f2",
    cta: "Review your account",
  },
  system: {
    emoji: "🔔",
    badge: "Notification",
    accent: BRAND,
    accentBg: BRAND_BG,
    cta: "View on Xwork",
  },
};

export function eventMeta(type?: string): EventMeta {
  return (type && EVENTS[type]) || EVENTS.system;
}

// Minimal HTML escaper for values we interpolate into the template. Bodies are
// app-generated, but escaping keeps stray characters from breaking the markup.
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderEmail({
  type,
  heading,
  body,
  ctaLabel,
  ctaUrl,
  preheader,
  appUrl,
}: {
  type?: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  preheader?: string;
  appUrl: string;
}): string {
  const m = eventMeta(type);
  const label = ctaLabel || (ctaUrl ? m.cta : undefined);
  const pre = (preheader || body).slice(0, 140);
  const prefsUrl = `${appUrl}/settings/notifications`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(
      pre
    )}</span>
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden">
        <div style="padding:20px 28px;border-bottom:1px solid #f0f0f0">
          <span style="font-size:20px;font-weight:800">
            <span style="color:${BRAND}">X</span><span style="color:#171717">work</span>
          </span>
        </div>
        <div style="padding:28px">
          <span style="display:inline-block;font-size:12px;font-weight:700;color:${
            m.accent
          };background:${m.accentBg};border-radius:9999px;padding:5px 12px;margin-bottom:16px">
            ${m.emoji}&nbsp;${esc(m.badge)}
          </span>
          <h1 style="font-size:19px;line-height:1.35;margin:0 0 10px;color:#171717">${esc(
            heading
          )}</h1>
          <p style="font-size:14px;line-height:1.65;color:#404040;margin:0">${esc(
            body
          )}</p>
          ${
            label && ctaUrl
              ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:22px;background:${m.accent};color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600">${esc(
                  label
                )}</a>`
              : ""
          }
        </div>
      </div>
      <p style="font-size:12px;color:#a3a3a3;text-align:center;margin:20px 0 4px">
        You're receiving this because you have an Xwork account.
      </p>
      <p style="font-size:12px;color:#a3a3a3;text-align:center;margin:0">
        <a href="${prefsUrl}" style="color:${BRAND};text-decoration:none">Manage email preferences</a>
      </p>
    </div>
  </body>
</html>`;
}
