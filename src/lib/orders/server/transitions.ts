import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  inventoryTable,
  inventoryTransactionTable,
  orderEventTable,
  orderItemTable,
  storeOrderTable,
} from "@/db/schema";

import {
  canTransition,
  deriveCompletion,
  isOrderStatus,
  isPaymentStatus,
  type OrderStatus,
  type PaymentStatus,
  STOCK_HELD,
} from "../status";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Actor =
  | { type: "staff"; id: string }
  | { type: "customer" }
  | { type: "rider" }
  | { type: "system" };

export type TransitionResult =
  | { ok: true; status: OrderStatus; version: number }
  | { ok: false; code: "not_found" | "conflict" | "invalid" | "stock"; error: string };

type OrderRow = typeof storeOrderTable.$inferSelect;

/** Lock the order row for the rest of the transaction. */
export async function lockOrder(tx: Tx, orderId: string): Promise<OrderRow | undefined> {
  const [row] = await tx.select().from(storeOrderTable).where(eq(storeOrderTable.id, orderId)).for("update");
  return row;
}

export async function addEvent(
  tx: Tx,
  orderId: string,
  actor: Actor,
  e: { type: string; from?: string | null; to?: string | null; data?: unknown; customerVisible?: boolean },
) {
  await tx.insert(orderEventTable).values({
    id: crypto.randomUUID(),
    orderId,
    type: e.type,
    fromStatus: e.from ?? null,
    toStatus: e.to ?? null,
    data: (e.data ?? null) as never,
    actorType: actor.type,
    actorId: actor.type === "staff" ? actor.id : null,
    customerVisible: e.customerVisible ?? false,
    createdAt: new Date(),
  });
}

/**
 * Move stock for an order's items. direction -1 deducts (on confirmation),
 * +1 restores (cancel/return after confirmation). Products without an
 * inventory row aren't stock-tracked and are skipped.
 */
async function moveStock(tx: Tx, order: OrderRow, direction: -1 | 1, actor: Actor): Promise<{ short: string[] }> {
  const items = await tx
    .select({ productId: orderItemTable.productId, name: orderItemTable.productName, quantity: orderItemTable.quantity })
    .from(orderItemTable)
    .where(eq(orderItemTable.orderId, order.id));
  const short: string[] = [];
  const now = new Date();
  for (const item of items) {
    if (!item.productId) continue;
    const delta = direction * item.quantity;
    const [inv] = await tx
      .update(inventoryTable)
      .set({
        quantityInStock: sql`${inventoryTable.quantityInStock} + ${delta}`,
        quantityAvailable: sql`${inventoryTable.quantityAvailable} + ${delta}`,
        updatedAt: now,
      })
      .where(eq(inventoryTable.productId, item.productId))
      .returning({ available: inventoryTable.quantityAvailable });
    if (!inv) continue;
    if (direction === -1 && inv.available < 0) short.push(item.name);
    if (actor.type === "staff") {
      await tx.insert(inventoryTransactionTable).values({
        id: crypto.randomUUID(),
        productId: item.productId,
        type: direction === -1 ? "out" : "in",
        quantity: delta,
        reason: direction === -1 ? "sale" : "return",
        reference: order.orderNumber,
        notes: direction === -1 ? "WhatsApp order confirmed" : "WhatsApp order cancelled/returned",
        performedBy: actor.id,
        createdAt: now,
      });
    }
  }
  return { short };
}

const TIMESTAMP_FOR: Partial<Record<OrderStatus, keyof OrderRow>> = {
  received: "whatsappReceivedAt",
  confirmed: "confirmedAt",
  delivered: "deliveredAt",
  picked_up: "deliveredAt",
};

/**
 * The single place order status changes happen. Enforces the transition map,
 * optimistic concurrency (expectedVersion), stock movement, completion and
 * the timeline event. Call inside db.transaction with the row locked.
 */
export async function transitionLocked(
  tx: Tx,
  order: OrderRow,
  to: OrderStatus,
  actor: Actor,
  opts: {
    expectedVersion?: number;
    undo?: boolean;
    reason?: string;
    note?: string;
    allowNegativeStock?: boolean;
    patch?: Partial<OrderRow>;
    eventData?: Record<string, unknown>;
  } = {},
): Promise<TransitionResult> {
  if (opts.expectedVersion !== undefined && opts.expectedVersion !== order.version) {
    return { ok: false, code: "conflict", error: "This order was changed by someone else. Refresh and try again." };
  }
  const from = order.status;
  if (!isOrderStatus(from) || !canTransition(from, to, { undo: opts.undo })) {
    return { ok: false, code: "invalid", error: `Can't move an order from “${from}” to “${to}”.` };
  }

  const patch: Partial<OrderRow> = { ...opts.patch };
  const wasHeld = STOCK_HELD.includes(from);
  const willHold = STOCK_HELD.includes(to);
  if (!wasHeld && willHold && !order.stockDeducted) {
    const { short } = await moveStock(tx, order, -1, actor);
    if (short.length > 0 && !opts.allowNegativeStock) {
      // Throwing rolls back the stock update.
      throw new StockShortError(short);
    }
    patch.stockDeducted = true;
  } else if (wasHeld && !willHold && order.stockDeducted) {
    await moveStock(tx, order, 1, actor);
    patch.stockDeducted = false;
  }

  const ts = TIMESTAMP_FOR[to];
  if (ts && !order[ts]) (patch as Record<string, unknown>)[ts] = new Date();
  if (opts.undo && (from === "delivered" || from === "picked_up" || from === "completed")) {
    patch.deliveredAt = null;
    patch.deliveryProof = null;
  }
  if (to === "cancelled") {
    patch.cancelReason = opts.reason ?? "other";
    if (order.paymentStatus === "paid" || order.paymentStatus === "partially_paid") patch.paymentStatus = "refund_due";
  }
  if (to !== "awaiting_customer") patch.expiresAt = null;

  const paymentStatus = (patch.paymentStatus ?? order.paymentStatus) as PaymentStatus;
  const finalStatus = isPaymentStatus(paymentStatus) ? deriveCompletion(to, paymentStatus) : to;

  const [updated] = await tx
    .update(storeOrderTable)
    .set({
      ...patch,
      status: finalStatus,
      attentionReason: null,
      version: order.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(storeOrderTable.id, order.id), eq(storeOrderTable.version, order.version)))
    .returning({ version: storeOrderTable.version });
  if (!updated) return { ok: false, code: "conflict", error: "This order was changed by someone else. Refresh and try again." };

  await addEvent(tx, order.id, actor, {
    type: opts.undo ? "undo" : "status_change",
    from,
    to: finalStatus,
    customerVisible: true,
    data: { reason: opts.reason, note: opts.note, ...opts.eventData },
  });
  return { ok: true, status: finalStatus, version: updated.version };
}

export class StockShortError extends Error {
  constructor(public items: string[]) {
    super(`Not enough stock for: ${items.join(", ")}`);
  }
}

/** Convenience wrapper: lock + transition in one transaction. */
export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: Actor,
  opts: Parameters<typeof transitionLocked>[4] = {},
): Promise<TransitionResult> {
  try {
    return await db.transaction(async (tx) => {
      const order = await lockOrder(tx, orderId);
      if (!order) return { ok: false, code: "not_found", error: "Order not found." } as const;
      return transitionLocked(tx, order, to, actor, opts);
    });
  } catch (error) {
    if (error instanceof StockShortError) {
      return { ok: false, code: "stock", error: `${error.message}. Confirm anyway to allow negative stock.` };
    }
    throw error;
  }
}
