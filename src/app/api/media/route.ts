import { NextRequest } from "next/server";
import { get } from "@vercel/blob";

import { decodeProxyParam } from "@/lib/blob-url";

const SAFE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

// Public image proxy for PRIVATE-blob product images. Streams the bytes with a
// long immutable cache so the CDN serves them fast; the blob token never leaves
// the server. No auth — these are public storefront images.
export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u");
  if (!u) return new Response("Missing image", { status: 400 });

  const url = decodeProxyParam(u);
  if (!url) return new Response("Invalid image", { status: 400 });

  try {
    const res = await get(url, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!res || res.statusCode !== 200) {
      return new Response("Not found", { status: 404 });
    }
    const contentType = (res.headers.get("content-type") || "image/webp")
      .split(";")[0]
      .trim()
      .toLowerCase();
    return new Response(res.stream, {
      status: 200,
      headers: {
        "Content-Type": SAFE_IMAGE_TYPES.has(contentType)
          ? contentType
          : "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Media proxy error:", error);
    return new Response("Not found", { status: 404 });
  }
}
