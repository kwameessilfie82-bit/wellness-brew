import type { MetadataRoute } from "next";

import { getActiveProductSlugs } from "@/lib/products/server";
import { absoluteImage, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  let products: MetadataRoute.Sitemap = [];
  try {
    const rows = await getActiveProductSlugs();
    products = rows.map((p) => ({
      url: absoluteUrl(`/shop/${encodeURIComponent(p.slug)}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => absoluteImage(i)).filter((i): i is string => Boolean(i)),
    }));
  } catch (error) {
    console.error("[sitemap] product read failed:", error);
  }
  return [...pages, ...products];
}
