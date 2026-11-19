import "server-only";

import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { promoCodeTable } from "@/db/schema";
import { parsePrice } from "@/lib/format";

import { normalizeCode, type PromoRule } from "./compute";

type PromoRow = typeof promoCodeTable.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function toRule(r: PromoRow): PromoRule & { id: string } {
  return {
    id: r.id,
    code: r.code,
    kind: r.kind as PromoRule["kind"],
    discountType: r.discountType as PromoRule["discountType"],
    value: parsePrice(r.value),
    minSubtotal: parsePrice(r.minSubtotal),
    bundleProductIds: Array.isArray(r.bundleProductIds) ? r.bundleProductIds : [],
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    maxUses: r.maxUses,
    uses: r.uses,
    isActive: r.isActive,
  };
}

export async function findPromo(raw: string): Promise<(PromoRule & { id: string }) | null> {
  const code = normalizeCode(raw);
  if (!code) return null;
  const [row] = await db.select().from(promoCodeTable).where(eq(promoCodeTable.code, code)).limit(1);
  return row ? toRule(row) : null;
}

/**
 * Count one use atomically inside the order transaction. Returns false when
 * another order took the last use in the meantime.
 */
export async function claimPromoUse(tx: Tx, promoId: string): Promise<boolean> {
  const rows = await tx
    .update(promoCodeTable)
    .set({ uses: sql`${promoCodeTable.uses} + 1`, updatedAt: new Date() })
    .where(
      and(
        eq(promoCodeTable.id, promoId),
        eq(promoCodeTable.isActive, true),
        or(isNull(promoCodeTable.maxUses), lt(promoCodeTable.uses, promoCodeTable.maxUses)),
      ),
    )
    .returning({ id: promoCodeTable.id });
  return rows.length > 0;
}
