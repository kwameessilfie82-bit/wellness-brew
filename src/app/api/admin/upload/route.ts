import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { withAdminAuth } from "@/lib/admin-middleware";
import { toProxyUrl } from "@/lib/blob-url";

// POST /api/admin/upload — store a product image in Vercel Blob and return its
// public URL. The client compresses before uploading, so objects stay small.
const postHandler = withAdminAuth(async (request: NextRequest) => {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
      contentType: file.type || "image/webp",
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
