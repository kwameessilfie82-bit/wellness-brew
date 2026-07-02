/**
 * One-time: move inline base64 product images into the PRIVATE Vercel Blob
 * store, downscale them, and replace the stored value with the /api/media proxy
 * path. Leaves /public, http(s), and existing /api/media entries as-is.
 *
 * Target DB comes ONLY from an explicit DATABASE_URL (no .env auto-load).
 * Requires BLOB_READ_WRITE_TOKEN.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... \
 *     npx tsx scripts/migrate-images-to-blob.mts
 */
import postgres from "postgres";
import { put } from "@vercel/blob";
import sharp from "sharp";

const url = process.env.DATABASE_URL;
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!url) {
  console.error("Set DATABASE_URL explicitly (this script does not read .env).");
  process.exit(1);
}
if (!token) {
  console.error("Set BLOB_READ_WRITE_TOKEN.");
  process.exit(1);
}

const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 30,
  ssl: isLocal ? false : "require",
});

const toProxyUrl = (blobUrl: string) =>
  `/api/media?u=${Buffer.from(blobUrl, "utf8").toString("base64url")}`;

try {
  const rows = await sql<{ id: string; images: string }[]>`
    SELECT id, images FROM product WHERE images LIKE '%data:%'
  `;
  console.log(`Found ${rows.length} product(s) with inline base64 images.`);

  let migrated = 0;
  for (const row of rows) {
    let arr: unknown;
    try {
      arr = JSON.parse(row.images);
    } catch {
      continue;
    }
    const first = Array.isArray(arr) ? arr[0] : null;
    if (typeof first !== "string" || !first.startsWith("data:")) continue;

    const m = first.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) continue;

    try {
      const input = Buffer.from(m[2], "base64");
      // Downscale + re-encode so the stored object is small and fast.
      const webp = await sharp(input)
        .resize({ width: 1000, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const blob = await put(`products/${row.id}.webp`, webp, {
        access: "private",
        addRandomSuffix: true,
        contentType: "image/webp",
        token,
      });
      const proxy = toProxyUrl(blob.url);
      await sql`UPDATE product SET images = ${JSON.stringify([proxy])} WHERE id = ${row.id}`;
      migrated++;
      console.log(
        `  ${row.id}: ${(input.length / 1e6).toFixed(2)}MB -> ${(webp.length / 1e3).toFixed(0)}KB -> ${proxy.slice(0, 40)}…`,
      );
    } catch (e) {
      console.error(`  failed ${row.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Migrated ${migrated} image(s) to private Blob.`);
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
