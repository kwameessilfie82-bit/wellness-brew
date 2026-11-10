/** Canonical origin for SEO (canonical URLs, sitemap, JSON-LD, OG). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wellnessgroupgh.com").replace(/\/$/, "");

/** Only the production deployment may be indexed; previews and local builds are noindex. */
export const IS_INDEXABLE = process.env.VERCEL_ENV === "production";

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Trim copy to a meta-description length on a word boundary. */
export function metaDescription(text: string | null | undefined, max = 155): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:\s-]+$/, "")}…`;
}

/** Image URLs in structured data / OG must be absolute. */
export function absoluteImage(src: string | null | undefined): string | undefined {
  if (!src || src === "/placeholder.svg") return undefined;
  return absoluteUrl(src);
}

/** Pages that set their own `openGraph` replace the parent's, so re-attach the site card. */
export const DEFAULT_OG_IMAGES = [{ url: "/opengraph-image", width: 1200, height: 630 }];
