/**
 * One-time: move inline base64 product images into Vercel Blob and replace the
 * stored value with the public Blob URL. Leaves /public and http(s) paths as-is.
 *
 * Target DB comes ONLY from an explicit DATABASE_URL (no .env auto-load).
 * Requires BLOB_READ_WRITE_TOKEN (a PUBLIC store).
 *
 * Usage:
 *   DATABASE_URL=postgresql://... BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... \
 *     npx tsx scripts/migrate-images-to-blob.mts
 */
import postgres from "postgres";
import { put } from "@vercel/blob";

const url = process.env.DATABASE_URL;
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!url) {
  console.error("Set DATABASE_URL explicitly (this script does not read .env).");
  process.exit(1);
}
if (!token) {
  console.error("Set BLOB_READ_WRITE_TOKEN (public store).");
  process.exit(1);
}

const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 30,
  ssl: isLocal ? false : "require",
});

function extFromDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) throw new Error("not a base64 data URL");
  return { buffer: Buffer.from(m[2], "base64"), contentType: m[1] };
}

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
    if (!Array.isArray(arr) || typeof arr[0] !== "string" || !arr[0].startsWith("data:")) {
      continue;
    }
    try {
      const { buffer, contentType } = extFromDataUrl(arr[0]);
      const ext = contentType.split("/")[1]?.split("+")[0] || "webp";
      const blob = await put(`products/${row.id}.${ext}`, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType,
        token,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      await sql`UPDATE product SET images = ${JSON.stringify([blob.url])} WHERE id = ${row.id}`;
      migrated++;
      console.log(`  ${row.id} -> ${blob.url}`);
    } catch (e) {
      console.error(`  failed ${row.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Migrated ${migrated} image(s) to Blob.`);
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
