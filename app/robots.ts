import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

// Allow crawling of public pages; keep private/app areas out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/settings",
          "/messages",
          "/finances",
          "/withdraw",
          "/transactions",
          "/api",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
