import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { withAdminAuth } from "@/lib/admin-middleware";
import { toProxyUrl } from "@/lib/blob-url";

// Raster formats only — SVG/HTML would be served same-origin by /api/media
// and become stored XSS.
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/webp", "image/webp"],
  ["image/avif", "image/avif"],
]);

/** Checks magic bytes so a renamed HTML file can't masquerade as an image. */
async function hasImageSignature(file: Blob): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // JPEG
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return true; // PNG
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return true; // WebP
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return true; // AVIF
  return false;
}

// POST /api/admin/upload — store a product image in Vercel Blob and return its
// public URL. The client compresses before uploading, so objects stay small.
const postHandler = withAdminAuth(async (request: NextRequest) => {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const contentType = ALLOWED_IMAGE_TYPES.get(file.type);
    if (!contentType || !(await hasImageSignature(file))) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP or AVIF images are allowed" },
        { status: 415 },
      );
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const rawName =
      (typeof form.get("filename") === "string"
        ? (form.get("filename") as string)
        : "product") || "product";
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60);

    const blob = await put(`products/${safeName}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });

    // Store the public proxy path (the private blob URL isn't directly fetchable).
    return NextResponse.json({ url: toProxyUrl(blob.url) });
  } catch (error) {
    console.error("Image upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}, ["canManageInventory", "canManageProducts"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return postHandler(request);
}
