/**
 * Run SQL migration files when drizzle-kit push fails.
 * Usage: node scripts/run-sql.mjs drizzle/0001_store_orders.sql
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to.sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or DATABASE_URL_DIRECT) is not set");
  process.exit(1);
}

/** Split on semicolons outside of strings (simple migrations only). */
function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);
}

const IGNORE_CODES = new Set([
  "42P07", // relation already exists (IF NOT EXISTS)
  "42710", // duplicate object
]);

const db = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 30,
  idle_timeout: 20,
});

const statements = splitStatements(readFileSync(file, "utf8"));

try {
  for (const statement of statements) {
    try {
      await db.unsafe(`${statement};`);
      console.log("OK:", statement.split("\n")[0].slice(0, 72));
    } catch (err) {
      const code = err?.code ?? err?.cause?.code;
      if (IGNORE_CODES.has(code)) {
        console.log("Skip (already applied):", code, statement.split("\n")[0].slice(0, 50));
        continue;
      }
      if (code === "23505" && statement.toUpperCase().includes("CREATE TABLE")) {
        console.log("Skip (type/table race):", statement.split("\n")[0].slice(0, 50));
        continue;
      }
      throw err;
    }
  }
  console.log(`\nFinished: ${file}`);
} catch (err) {
  console.error("\nMigration failed:", err.message ?? err);
  if (err.code === "ENOTFOUND") {
    console.error(
      "\nDNS could not resolve the database host. Check internet/VPN and DATABASE_URL in .env.",
    );
  }
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
