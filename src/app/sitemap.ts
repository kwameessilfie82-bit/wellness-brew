import type { MetadataRoute } from "next";

import { getPublishedPostSlugs } from "@/lib/journal/server";
import { getActiveProductSlugs } from "@/lib/products/server";
import { getPublicSettings } from "@/lib/settings/get";
import { absoluteImage, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/journal"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/delivery"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/returns"), changeFrequency: "monthly", priority: 0.3 },
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
  let extra: MetadataRoute.Sitemap = [];
  try {
    const [{ features }, posts] = await Promise.all([getPublicSettings(), getPublishedPostSlugs()]);
    extra = [
      ...(features.gifting ? [{ url: absoluteUrl("/gifting"), changeFrequency: "monthly" as const, priority: 0.6 }] : []),
      ...(features.teaFinder ? [{ url: absoluteUrl("/tea-finder"), changeFrequency: "monthly" as const, priority: 0.5 }] : []),
      ...(features.stockists ? [{ url: absoluteUrl("/stockists"), changeFrequency: "monthly" as const, priority: 0.5 }] : []),
      ...posts.map((p) => ({
        url: absoluteUrl(`/journal/${encodeURIComponent(p.slug)}`),
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    console.error("[sitemap] journal/features read failed:", error);
  }
  return [...pages, ...extra, ...products];
}
