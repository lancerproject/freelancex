import type { NextConfig } from "next";

// Baseline security response headers, applied to every route. These are the
// headers merchant/PCI reviewers expect and are safe for this app:
//  • HSTS forces HTTPS for a year (incl. subdomains).
//  • X-Content-Type-Options stops MIME sniffing.
//  • X-Frame-Options + frame-ancestors stop click-jacking (no embedding).
//  • Referrer-Policy avoids leaking full URLs to third parties.
//  • Permissions-Policy disables sensors we don't use, but KEEPS camera on
//    self (identity-verification selfie) — do not remove `camera=(self)`.
// A full Content-Security-Policy is intentionally NOT set here: it would need
// per-origin allow-listing (Supabase, the face-api CDN, inline Next runtime)
// and careful testing to avoid breaking the app — tracked as a follow-up.
// Content-Security-Policy. Allow-lists exactly the origins the BROWSER talks to
// (server-side fetches — Groq/Anthropic/Resend — are not governed by CSP).
//   • Supabase REST + realtime (wss) + storage images
//   • jsdelivr for the face-api verification library + its model files
//   • data:/blob: for image/file previews
// 'unsafe-inline'/'unsafe-eval' on script-src are required by Next's runtime
// bootstrap and the face-api/WASM backend — without them the app white-screens.
// The meaningful hardening here is frame-ancestors/object-src/base-uri/
// form-action, which block clickjacking, plugin/embeds and base-tag hijacking.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
