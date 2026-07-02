/**
 * Backfill invoice pricing tiers on the product table from the legacy
 * hardcoded sample-products list, matching by product name.
 *
 * Target DB is taken ONLY from an explicit DATABASE_URL env var (no .env
 * auto-load) so it can never hit the wrong database by accident.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/backfill-tiered-prices.mts
 */
import postgres from "postgres";

type SampleProduct = {
  name: string;
  customerPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  wholesalePrice2: number;
  distributorPrice: number;
};

const mod: Record<string, unknown> = await import("../src/lib/sample-products");
const sampleProducts = (mod.sampleProducts ??
  (mod.default as Record<string, unknown> | undefined)?.sampleProducts ??
  mod.default) as SampleProduct[] | undefined;

if (!Array.isArray(sampleProducts)) {
  console.error("Could not load sampleProducts; module keys:", Object.keys(mod));
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL explicitly (this script does not read .env).");
  process.exit(1);
}

const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 30,
  ssl: isLocal ? false : "require",
});

try {
  let matched = 0;
  for (const p of sampleProducts) {
    const res = await sql`
      UPDATE product SET
        customer_price = ${p.customerPrice},
        retail_price = ${p.retailPrice},
        wholesale_price = ${p.wholesalePrice},
        wholesale_price2 = ${p.wholesalePrice2},
        distributor_price = ${p.distributorPrice}
      WHERE name = ${p.name}
    `;
    if (res.count > 0) matched += res.count;
    else console.log("  no product named:", p.name);
  }
  console.log(`Backfilled tiers on ${matched} product row(s) from ${sampleProducts.length} sample entries.`);

  // Fallback: any product still missing a customer price gets its base price,
  // so the invoice generator always has at least one usable tier.
  const filled = await sql`
    UPDATE product SET customer_price = price WHERE customer_price IS NULL
  `;
  console.log(`Set customer_price = price on ${filled.count} product(s) with no tier match.`);
} catch (err) {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
