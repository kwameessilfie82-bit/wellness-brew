import "server-only";

// Images live in a PRIVATE Vercel Blob store, so their real URLs 403 for the
// public. We store a stable proxy path in the DB instead and stream the bytes
// through /api/media (which holds the token) with long, immutable CDN caching.

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

/** DB/display value for a product image backed by a private blob URL. */
export function toProxyUrl(blobUrl: string): string {
  return `/api/media?u=${Buffer.from(blobUrl, "utf8").toString("base64url")}`;
}

/** Decode + SSRF-guard the proxy param back to a blob URL (or null if bad). */
export function decodeProxyParam(u: string): string | null {
  try {
    const url = Buffer.from(u, "base64url").toString("utf8");
    const host = new URL(url).hostname;
    if (!host.endsWith(BLOB_HOST_SUFFIX)) return null;
    return url;
  } catch {
    return null;
  }
}
