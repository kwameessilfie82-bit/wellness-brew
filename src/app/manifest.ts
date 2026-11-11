import type { MetadataRoute } from "next";

import { getPublicSettings } from "@/lib/settings/get";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brand } = await getPublicSettings();
  return {
    name: brand.tagline ? `${brand.name} - ${brand.tagline}` : brand.name,
    short_name: brand.name.slice(0, 12),
    description: brand.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2d6a4f",
    lang: "en-GH",
    categories: ["food", "shopping", "health"],
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
