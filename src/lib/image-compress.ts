/**
 * Client-side image compression for admin uploads.
 *
 * The catalog stores images inline as base64 data URLs in a Postgres `text`
 * column, so keeping them small matters for both upload success and the size
 * of every product/category payload. Instead of asking the owner to manually
 * shrink images, we downscale + re-encode whatever they pick to a sensible
 * web size right in the browser.
 */

export interface CompressOptions {
  /** Longest edge in pixels. Images larger than this are scaled down. */
  maxDimension?: number;
  /** Target maximum size (in bytes) of the encoded image. */
  maxBytes?: number;
  /** Preferred output format. Falls back to JPEG when unsupported. */
  mimeType?: "image/webp" | "image/jpeg";
  /** Initial encode quality (0–1). Lowered until under `maxBytes`. */
  quality?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1280,
  maxBytes: 400 * 1024,
  mimeType: "image/webp",
  quality: 0.82,
};

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Approximate decoded byte length of a base64 data URL. */
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

async function loadBitmap(
  file: Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` honours EXIF orientation so portrait photos aren't rotated.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img> loader.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Downscale and re-encode an image file, returning a compressed data URL.
 * Non-raster inputs (SVG/GIF) and any failure fall back to the original bytes.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {},
): Promise<string> {
  const opts = { ...DEFAULTS, ...options };

  // Vector / animated formats don't benefit from canvas re-encoding.
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return readAsDataURL(file);
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    return readAsDataURL(file);
  }

  const srcW =
    "width" in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const srcH =
    "height" in bitmap
      ? bitmap.height
      : (bitmap as HTMLImageElement).naturalHeight;

  const scale = Math.min(1, opts.maxDimension / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return readAsDataURL(file);
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  if ("close" in bitmap) {
    (bitmap as ImageBitmap).close();
  }

  // Pick a supported output format (Safari historically lacked webp encode).
  let mime: string = opts.mimeType;
  let quality = opts.quality;
  let dataUrl = canvas.toDataURL(mime, quality);
  if (!dataUrl.startsWith(`data:${mime}`)) {
    mime = "image/jpeg";
    dataUrl = canvas.toDataURL(mime, quality);
  }

  // Step quality down until the encoded image fits the byte budget.
  while (dataUrlBytes(dataUrl) > opts.maxBytes && quality > 0.4) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL(mime, quality);
  }

  // If, somehow, compression produced something larger than the original
  // (tiny already-optimised files), keep whichever is smaller.
  if (dataUrlBytes(dataUrl) >= file.size) {
    const original = await readAsDataURL(file);
    return original.length < dataUrl.length ? original : dataUrl;
  }

  return dataUrl;
}
