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
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
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
