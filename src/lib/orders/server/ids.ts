import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { sql } from "drizzle-orm";

import type { db } from "@/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** 128-bit URL-safe token for /o/<token> and /r/<token>. */
export function newToken(): string {
  return randomBytes(16).toString("base64url");
}

/** 4-digit delivery code (no leading-zero confusion when read aloud: 1000–9999). */
export function newDeliveryCode(): string {
  return String(randomInt(1000, 10000));
}

/** WB-<YYMM>-<seq>, e.g. WB-2611-0042. Sequence-backed: race-free, gaps are fine. */
export async function nextOrderNumber(tx: Tx, now = new Date()): Promise<string> {
  const rows = await tx.execute<{ n: string }>(sql`SELECT nextval('order_number_seq')::text AS n`);
  const n = (rows as unknown as { n: string }[])[0].n;
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `WB-${yymm}-${n.padStart(4, "0")}`;
}
