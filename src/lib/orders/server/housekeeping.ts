import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

import { pruneRateLimits } from "./rate-limit";

/**
 * Expire orders never sent on WhatsApp past their expires_at. Stock was never
 * deducted for these (that happens at confirmation), so this is a pure status
 * change + timeline event. Set-based and idempotent; uses the partial index.
 */
export async function expireStaleOrders(): Promise<number> {
  const rows = await db.execute<{ id: string }>(sql`
    WITH expired AS (
      UPDATE store_order
         SET status = 'expired', cancel_reason = 'expired', version = version + 1, updated_at = now()
       WHERE status = 'awaiting_customer' AND expires_at IS NOT NULL AND expires_at < now()
       RETURNING id
    )
    INSERT INTO order_event (id, order_id, type, from_status, to_status, actor_type, customer_visible, created_at)
    SELECT gen_random_uuid()::text, id, 'status_change', 'awaiting_customer', 'expired', 'system', true, now()
      FROM expired
    RETURNING order_id AS id
  `);
  return (rows as unknown as unknown[]).length;
}

/** Flag orders sitting too long in a status so they show under "Needs action". */
export async function flagStuckOrders(): Promise<void> {
  await db.execute(sql`
    UPDATE store_order SET attention_reason = 'stuck'
     WHERE attention_reason IS NULL AND (
       (status = 'received' AND updated_at < now() - interval '12 hours') OR
       (status IN ('confirmed', 'preparing') AND updated_at < now() - interval '48 hours') OR
       (status IN ('out_for_delivery', 'ready_for_pickup') AND updated_at < now() - interval '24 hours')
     )
  `);
}

export async function runHousekeeping() {
  const expired = await expireStaleOrders();
  await flagStuckOrders();
  await pruneRateLimits();
  return { expired };
}
