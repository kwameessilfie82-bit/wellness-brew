import "server-only";

import { and, asc, desc, eq, ilike, inArray, isNotNull, lt, or, type SQL, sql } from "drizzle-orm";

import { db } from "@/db";
import { adminUserTable, orderEventTable, orderItemTable, storeOrderTable, userTable } from "@/db/schema";

import { normalizePhone } from "../phone";

export const ORDER_TABS = ["needs_action", "active", "delivered_unpaid", "done", "closed", "all"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const ORDER_TAB_LABELS: Record<OrderTab, string> = {
  needs_action: "Needs action",
  active: "In progress",
  delivered_unpaid: "Delivered, unpaid",
  done: "Completed",
  closed: "Cancelled / expired",
  all: "All",
};

const o = storeOrderTable;

function tabWhere(tab: OrderTab): SQL | undefined {
  switch (tab) {
    case "needs_action":
      return or(
        inArray(o.status, ["awaiting_customer", "received", "delivery_failed"]),
        eq(o.paymentStatus, "pending_verification"),
        and(isNotNull(o.attentionReason), inArray(o.status, ["confirmed", "preparing", "ready_for_pickup", "out_for_delivery"])),
      );
    case "active":
      return inArray(o.status, ["confirmed", "preparing", "ready_for_pickup", "out_for_delivery"]);
    case "delivered_unpaid":
      return inArray(o.status, ["delivered", "picked_up"]);
    case "done":
      return eq(o.status, "completed");
    case "closed":
      return inArray(o.status, ["cancelled", "expired", "returned"]);
    default:
      return undefined;
  }
}

/** "WB-2611-0042" → exact number; phone-like → E.164 match; else name search. */
function searchWhere(q: string): SQL | undefined {
  const query = q.trim();
  if (!query) return undefined;
  if (/^wb-?\d{4}-?\d+$/i.test(query)) {
    const digits = query.replace(/[^\d]/g, "");
    return eq(o.orderNumber, `WB-${digits.slice(0, 4)}-${digits.slice(4)}`);
  }
  if (/^[+\d][\d\s()-]{6,}$/.test(query)) {
    const phone = normalizePhone(query);
    if (phone) return eq(o.customerPhoneE164, phone);
  }
  const like = `%${query.replace(/[%_\\]/g, "")}%`;
  return or(ilike(o.customerName, like), ilike(o.orderNumber, like));
}

export type OrderListRow = Awaited<ReturnType<typeof listOrders>>["rows"][number];

export async function listOrders(opts: { tab: OrderTab; q?: string; cursor?: string; limit?: number }) {
  const limit = Math.min(opts.limit ?? 30, 100);
  const conds: (SQL | undefined)[] = [opts.q ? searchWhere(opts.q) : tabWhere(opts.tab)];
  if (opts.cursor) {
    const [ts, id] = opts.cursor.split("|");
    const at = new Date(ts);
    if (!Number.isNaN(at.getTime()) && id) {
      conds.push(or(lt(o.createdAt, at), and(eq(o.createdAt, at), lt(o.id, id))));
    }
  }
  const rows = await db
    .select({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      customerName: o.customerName,
      customerPhoneE164: o.customerPhoneE164,
      fulfilment: o.fulfilment,
      deliveryArea: o.deliveryArea,
      pickupLocationName: o.pickupLocationName,
      total: o.total,
      deliveryFeeConfirmed: o.deliveryFeeConfirmed,
      channel: o.channel,
      attentionReason: o.attentionReason,
      assignedToName: userTable.name,
      createdAt: o.createdAt,
      itemCount: sql<number>`(select coalesce(sum(${orderItemTable.quantity}), 0)::int from ${orderItemTable} where ${orderItemTable.orderId} = ${o.id})`,
    })
    .from(o)
    .leftJoin(adminUserTable, eq(adminUserTable.id, o.assignedTo))
    .leftJoin(userTable, eq(userTable.id, adminUserTable.userId))
    .where(and(...conds))
    .orderBy(desc(o.createdAt), desc(o.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    rows: page,
    nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

/** Badge counts for every tab in one query. */
export async function orderTabCounts(): Promise<Record<OrderTab, number>> {
  const cnt = (w: SQL | undefined) => sql<number>`count(*) filter (where ${w ?? sql`true`})::int`;
  const [row] = await db
    .select({
      needs_action: cnt(tabWhere("needs_action")),
      active: cnt(tabWhere("active")),
      delivered_unpaid: cnt(tabWhere("delivered_unpaid")),
      done: cnt(tabWhere("done")),
      closed: cnt(tabWhere("closed")),
      all: sql<number>`count(*)::int`,
    })
    .from(o);
  return row;
}

export async function getOrderDetail(orderId: string) {
  const [order] = await db.select().from(o).where(eq(o.id, orderId)).limit(1);
  if (!order) return null;
  const [items, events, otherOrders] = await Promise.all([
    db.select().from(orderItemTable).where(eq(orderItemTable.orderId, orderId)),
    db
      .select({
        id: orderEventTable.id,
        type: orderEventTable.type,
        fromStatus: orderEventTable.fromStatus,
        toStatus: orderEventTable.toStatus,
        data: orderEventTable.data,
        actorType: orderEventTable.actorType,
        actorName: userTable.name,
        createdAt: orderEventTable.createdAt,
      })
      .from(orderEventTable)
      .leftJoin(adminUserTable, eq(adminUserTable.id, orderEventTable.actorId))
      .leftJoin(userTable, eq(userTable.id, adminUserTable.userId))
      .where(eq(orderEventTable.orderId, orderId))
      .orderBy(asc(orderEventTable.createdAt)),
    order.customerPhoneE164
      ? db
          .select({ id: o.id, orderNumber: o.orderNumber, status: o.status, total: o.total, createdAt: o.createdAt })
          .from(o)
          .where(and(eq(o.customerPhoneE164, order.customerPhoneE164), sql`${o.id} <> ${orderId}`))
          .orderBy(desc(o.createdAt))
          .limit(10)
      : Promise.resolve([]),
  ]);
  return { order, items, events, otherOrders };
}

/** Staff who can be assigned orders. */
export async function listStaff() {
  return db
    .select({ id: adminUserTable.id, name: userTable.name, email: userTable.email })
    .from(adminUserTable)
    .innerJoin(userTable, eq(userTable.id, adminUserTable.userId))
    .where(eq(adminUserTable.isActive, true));
}
