import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { get } from "@vercel/blob";

import { decodeProxyParam } from "@/lib/blob-url";

export const OG_SIZE = { width: 1200, height: 630 };
export const BRAND_GREEN = "#2d6a4f";
export const BRAND_CREAM = "#f6f1e7";

const PUBLIC_DIR = path.join(process.cwd(), "public");

async function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T | null> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    t = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function readBytes(src: string): Promise<Buffer | null> {
  if (src.startsWith("/api/media?")) {
    const u = new URLSearchParams(src.split("?")[1]).get("u");
    const blobUrl = u ? decodeProxyParam(u) : null;
    if (!blobUrl) return null;
    const res = await get(blobUrl, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!res || res.statusCode !== 200) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  if (src.startsWith("/")) {
    const file = path.join(PUBLIC_DIR, path.normalize(decodeURIComponent(src)).replace(/^([/\\])+/, ""));
    if (!file.startsWith(PUBLIC_DIR)) return null;
    return readFile(file);
  }
  return null;
}

/**
 * Any storefront image (public file, Blob proxy URL, or https) as a PNG data
 * URL that ImageResponse can render (it can't decode webp). Never throws.
 */
export async function imageDataUrl(src: string | null | undefined, maxPx = 800): Promise<string | null> {
  if (!src || src === "/placeholder.svg") return null;
  try {
    const bytes = await withTimeout(readBytes(src));
    if (!bytes) return null;
    const sharp = (await import("sharp")).default;
    const png = await sharp(bytes).resize({ width: maxPx, height: maxPx, fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
