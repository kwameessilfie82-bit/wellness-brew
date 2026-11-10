import type { MetadataRoute } from "next";

import { IS_INDEXABLE, SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE) {
    // Previews / vercel.app aliases must never compete with the canonical domain.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account", "/auth", "/cart", "/order", "/o/", "/r/", "/*?search="],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
