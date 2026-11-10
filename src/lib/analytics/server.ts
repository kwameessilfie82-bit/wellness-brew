import "server-only";

import { and, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categoryTable,
  inventoryTable,
  invoiceItemTable,
  invoiceTable,
  productTable,
  storeOrderTable,
} from "@/db/schema";

/**
 * Business analytics. Money comes from invoices — the sales ledger, which
 * includes confirmed WhatsApp orders (synced) and invoices made by hand.
 * Order behaviour (funnel, speed, customers) comes from WhatsApp orders.
 * Ghana is UTC+0, so UTC day boundaries are local day boundaries.
 */

const o = storeOrderTable;
const DAY = 86_400_000;

export const RANGES = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGES)[number];
export const parseRange = (v: string | undefined): RangeDays => {
  const n = Number(v);
  return (RANGES as readonly number[]).includes(n) ? (n as RangeDays) : 30;
};

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** [from, to) for the last `days` days including today, and the window before it. */
export function windows(days: number, now = new Date()) {
  const to = new Date(startOfUtcDay(now).getTime() + DAY);
  const from = new Date(to.getTime() - days * DAY);
  const prevFrom = new Date(from.getTime() - days * DAY);
  return { from, to, prevFrom };
}

const num = (v: unknown) => Number(v ?? 0) || 0;

async function salesTotals(from: Date, to: Date) {
  const [money] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${invoiceTable.total}), 0)`,
      sales: sql<number>`count(*)::int`,
    })
    .from(invoiceTable)
    .where(and(gte(invoiceTable.invoiceDate, from), lt(invoiceTable.invoiceDate, to)));
  const [units] = await db
    .select({ units: sql<number>`coalesce(sum(${invoiceItemTable.quantity}), 0)::int` })
    .from(invoiceItemTable)
    .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
    .where(and(gte(invoiceTable.invoiceDate, from), lt(invoiceTable.invoiceDate, to)));
  const revenue = num(money.revenue);
  const sales = num(money.sales);
  return { revenue, sales, units: num(units.units), aov: sales > 0 ? revenue / sales : 0 };
}

export type SalesTotals = Awaited<ReturnType<typeof salesTotals>>;

/** % change, or null when there's no baseline to compare with. */
export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return ((now - before) / before) * 100;
}

/** Headline numbers for the dashboard home: today, this week vs last week, open work. */
export async function dashboardSnapshot() {
  const now = new Date();
  const today = startOfUtcDay(now);
  const tomorrow = new Date(today.getTime() + DAY);
  const week = windows(7, now);
  const [todaySales, thisWeek, lastWeek, [money], [stock], series] = await Promise.all([
    salesTotals(today, tomorrow),
    salesTotals(week.from, week.to),
    salesTotals(week.prevFrom, week.from),
    db
      .select({
        owed: sql<string>`coalesce(sum(greatest(${o.total} - ${o.amountPaid}, 0)) filter (where ${o.status} in ('delivered','picked_up')), 0)`,
        owedCount: sql<number>`count(*) filter (where ${o.status} in ('delivered','picked_up'))::int`,
        refundDue: sql<number>`count(*) filter (where ${o.paymentStatus} = 'refund_due')::int`,
        toVerify: sql<number>`count(*) filter (where ${o.paymentStatus} = 'pending_verification')::int`,
        ordersToday: sql<number>`count(*) filter (where ${o.createdAt} >= ${today.toISOString()}::timestamp and ${o.channel} = 'whatsapp')::int`,
      })
      .from(o),
    db
      .select({
        low: sql<number>`count(*) filter (where ${inventoryTable.quantityAvailable} > 0 and ${inventoryTable.quantityAvailable} <= ${inventoryTable.lowStockThreshold})::int`,
        out: sql<number>`count(*) filter (where ${inventoryTable.quantityAvailable} <= 0)::int`,
      })
      .from(inventoryTable)
      .innerJoin(productTable, and(eq(productTable.id, inventoryTable.productId), eq(productTable.isActive, true))),
    dailyRevenue(14, now),
  ]);
  return {
    today: todaySales,
    thisWeek,
    lastWeek,
    weekChange: change(thisWeek.revenue, lastWeek.revenue),
    owed: num(money.owed),
    owedCount: num(money.owedCount),
    refundDue: num(money.refundDue),
    toVerify: num(money.toVerify),
    ordersToday: num(money.ordersToday),
    lowStock: num(stock?.low),
    outOfStock: num(stock?.out),
    series,
  };
}

/** Revenue per day with empty days filled in. */
async function dailyRevenue(days: number, now = new Date()) {
  const { from, to } = windows(days, now);
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${invoiceTable.invoiceDate}), 'YYYY-MM-DD')`,
      revenue: sql<string>`coalesce(sum(${invoiceTable.total}), 0)`,
    })
    .from(invoiceTable)
    .where(and(gte(invoiceTable.invoiceDate, from), lt(invoiceTable.invoiceDate, to)))
    .groupBy(sql`1`);
  const orders = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${o.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(o)
    .where(and(eq(o.channel, "whatsapp"), gte(o.createdAt, from), lt(o.createdAt, to)))
    .groupBy(sql`1`);
  const rev = new Map(rows.map((r) => [r.day, num(r.revenue)]));
  const ord = new Map(orders.map((r) => [r.day, num(r.count)]));
  const out: { day: string; revenue: number; orders: number }[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push({ day, revenue: rev.get(day) ?? 0, orders: ord.get(day) ?? 0 });
  }
  return out;
}

/** Group long ranges by week so a year isn't 365 hairline bars. */
function bucket(series: { day: string; revenue: number; orders: number }[], days: number) {
  if (days <= 90) return series;
  const out: typeof series = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    out.push({
      day: chunk[0].day,
      revenue: chunk.reduce((s, r) => s + r.revenue, 0),
      orders: chunk.reduce((s, r) => s + r.orders, 0),
    });
  }
  return out;
}

export async function businessAnalytics(days: RangeDays) {
  const now = new Date();
  const { from, to, prevFrom } = windows(days, now);
  const inRange = and(gte(invoiceTable.invoiceDate, from), lt(invoiceTable.invoiceDate, to));
  const ordersInRange = and(eq(o.channel, "whatsapp"), gte(o.createdAt, from), lt(o.createdAt, to));

  const [
    current,
    previous,
    series,
    topProducts,
    byCategory,
    [funnel],
    cancelReasons,
    areas,
    payments,
    weekdays,
    [customers],
    topCustomers,
    [stockValue],
    lowStock,
  ] = await Promise.all([
    salesTotals(from, to),
    salesTotals(prevFrom, from),
    dailyRevenue(days, now),
    db
      .select({
        name: invoiceItemTable.productName,
        units: sql<number>`sum(${invoiceItemTable.quantity})::int`,
        revenue: sql<string>`sum(${invoiceItemTable.lineTotal})`,
      })
      .from(invoiceItemTable)
      .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
      .where(inRange)
      .groupBy(invoiceItemTable.productName)
      .orderBy(sql`sum(${invoiceItemTable.lineTotal}) desc`)
      .limit(10),
    db
      .select({
        name: sql<string>`coalesce(${categoryTable.name}, 'Uncategorised')`,
        units: sql<number>`sum(${invoiceItemTable.quantity})::int`,
        revenue: sql<string>`sum(${invoiceItemTable.lineTotal})`,
      })
      .from(invoiceItemTable)
      .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
      .leftJoin(categoryTable, eq(invoiceItemTable.categoryId, categoryTable.id))
      .where(inRange)
      .groupBy(sql`1`)
      .orderBy(sql`sum(${invoiceItemTable.lineTotal}) desc`),
    db
      .select({
        placed: sql<number>`count(*)::int`,
        sent: sql<number>`count(*) filter (where ${o.whatsappReceivedAt} is not null or ${o.confirmedAt} is not null)::int`,
        confirmed: sql<number>`count(*) filter (where ${o.confirmedAt} is not null)::int`,
        handedOver: sql<number>`count(*) filter (where ${o.deliveredAt} is not null)::int`,
        completed: sql<number>`count(*) filter (where ${o.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${o.status} = 'cancelled')::int`,
        expired: sql<number>`count(*) filter (where ${o.status} = 'expired')::int`,
        returned: sql<number>`count(*) filter (where ${o.status} = 'returned')::int`,
        delivery: sql<number>`count(*) filter (where ${o.fulfilment} = 'delivery')::int`,
        pickup: sql<number>`count(*) filter (where ${o.fulfilment} = 'pickup')::int`,
        gifts: sql<number>`count(*) filter (where ${o.isGift})::int`,
        // Minutes from order to confirmation / confirmation to hand-over (medians).
        confirmMins: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${o.confirmedAt} - ${o.createdAt})) / 60) filter (where ${o.confirmedAt} is not null)`,
        deliverMins: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${o.deliveredAt} - ${o.confirmedAt})) / 60) filter (where ${o.deliveredAt} is not null and ${o.confirmedAt} is not null)`,
      })
      .from(o)
      .where(ordersInRange),
    db
      .select({ reason: sql<string>`coalesce(${o.cancelReason}, 'other')`, count: sql<number>`count(*)::int` })
      .from(o)
      .where(and(ordersInRange, eq(o.status, "cancelled")))
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`),
    db
      .select({
        area: sql<string>`coalesce(nullif(${o.deliveryArea}, ''), 'Not given')`,
        count: sql<number>`count(*)::int`,
      })
      .from(o)
      .where(and(ordersInRange, eq(o.fulfilment, "delivery")))
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`)
      .limit(8),
    db
      .select({ method: sql<string>`coalesce(${o.preferredPayment}, 'unknown')`, count: sql<number>`count(*)::int` })
      .from(o)
      .where(ordersInRange)
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`),
    db
      .select({ dow: sql<number>`extract(isodow from ${o.createdAt})::int`, count: sql<number>`count(*)::int` })
      .from(o)
      .where(ordersInRange)
      .groupBy(sql`1`),
    db.execute(sql`
      with buyers as (
        select customer_phone_e164 as phone, min(created_at) as first_seen
        from store_order
        where channel = 'whatsapp' and confirmed_at is not null and customer_phone_e164 is not null
          and status not in ('cancelled', 'returned')
        group by 1
      ),
      active as (
        select distinct customer_phone_e164 as phone
        from store_order
        where channel = 'whatsapp' and confirmed_at is not null
          and status not in ('cancelled', 'returned')
          and created_at >= ${from.toISOString()}::timestamp and created_at < ${to.toISOString()}::timestamp
      )
      select
        (select count(*) from active)::int as buyers,
        (select count(*) from active a join buyers b using (phone) where b.first_seen >= ${from.toISOString()}::timestamp)::int as new_buyers,
        (select count(*) from active a join buyers b using (phone) where b.first_seen < ${from.toISOString()}::timestamp)::int as returning_buyers
    `).then((r) => (r as unknown as { rows?: Record<string, unknown>[] }).rows ?? (r as unknown as Record<string, unknown>[])),
    db
      .select({
        name: sql<string>`max(${o.customerName})`,
        phone: o.customerPhoneE164,
        orders: sql<number>`count(*)::int`,
        spent: sql<string>`sum(${o.total})`,
      })
      .from(o)
      .where(
        and(
          ordersInRange,
          isNotNull(o.confirmedAt),
          isNotNull(o.customerPhoneE164),
          sql`${o.status} not in ('cancelled','returned')`,
        ),
      )
      .groupBy(o.customerPhoneE164)
      .orderBy(sql`sum(${o.total}) desc`)
      .limit(5),
    db
      .select({
        value: sql<string>`coalesce(sum(greatest(${inventoryTable.quantityAvailable}, 0) * ${productTable.price}), 0)`,
        units: sql<number>`coalesce(sum(greatest(${inventoryTable.quantityAvailable}, 0)), 0)::int`,
      })
      .from(inventoryTable)
      .innerJoin(productTable, and(eq(productTable.id, inventoryTable.productId), eq(productTable.isActive, true))),
    lowStockItems(8),
  ]);

  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dowMap = new Map(weekdays.map((w) => [num(w.dow), num(w.count)]));

  return {
    days,
    from: from.toISOString(),
    to: to.toISOString(),
    current,
    previous,
    changes: {
      revenue: change(current.revenue, previous.revenue),
      sales: change(current.sales, previous.sales),
      aov: change(current.aov, previous.aov),
      units: change(current.units, previous.units),
    },
    series: bucket(series, days),
    weekly: days > 90,
    topProducts: topProducts.map((r) => ({ name: r.name, units: num(r.units), revenue: num(r.revenue) })),
    byCategory: byCategory.map((r) => ({ name: r.name, units: num(r.units), revenue: num(r.revenue) })),
    funnel: {
      placed: num(funnel?.placed),
      sent: num(funnel?.sent),
      confirmed: num(funnel?.confirmed),
      handedOver: num(funnel?.handedOver),
      completed: num(funnel?.completed),
      cancelled: num(funnel?.cancelled),
      expired: num(funnel?.expired),
      returned: num(funnel?.returned),
      delivery: num(funnel?.delivery),
      pickup: num(funnel?.pickup),
      gifts: num(funnel?.gifts),
      confirmMins: funnel?.confirmMins === null || funnel?.confirmMins === undefined ? null : num(funnel.confirmMins),
      deliverMins: funnel?.deliverMins === null || funnel?.deliverMins === undefined ? null : num(funnel.deliverMins),
    },
    cancelReasons: cancelReasons.map((r) => ({ reason: r.reason, count: num(r.count) })),
    areas: areas.map((r) => ({ name: r.area, count: num(r.count) })),
    payments: payments.map((r) => ({ method: r.method, count: num(r.count) })),
    weekdays: weekdayNames.map((name, i) => ({ name, count: dowMap.get(i + 1) ?? 0 })),
    customers: {
      buyers: num(customers?.buyers),
      newBuyers: num(customers?.new_buyers),
      returning: num(customers?.returning_buyers),
    },
    topCustomers: topCustomers.map((r) => ({ name: r.name, phone: r.phone ?? "", orders: num(r.orders), spent: num(r.spent) })),
    stock: { value: num(stockValue?.value), units: num(stockValue?.units) },
    lowStock,
  };
}

export type BusinessAnalytics = Awaited<ReturnType<typeof businessAnalytics>>;

/** Active products at or below their low-stock threshold, emptiest first. */
export async function lowStockItems(limit: number) {
  const rows = await db
    .select({
      productId: productTable.id,
      name: productTable.name,
      available: inventoryTable.quantityAvailable,
      threshold: inventoryTable.lowStockThreshold,
    })
    .from(inventoryTable)
    .innerJoin(productTable, and(eq(productTable.id, inventoryTable.productId), eq(productTable.isActive, true)))
    .where(sql`${inventoryTable.quantityAvailable} <= ${inventoryTable.lowStockThreshold}`)
    .orderBy(inventoryTable.quantityAvailable, productTable.name)
    .limit(limit);
  return rows.map((r) => ({ ...r, name: r.name.trim() }));
}

/** Most recent WhatsApp orders for the dashboard. */
export async function recentOrders(limit: number) {
  return db
    .select({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      customerName: o.customerName,
      total: o.total,
      deliveryFeeConfirmed: o.deliveryFeeConfirmed,
      fulfilment: o.fulfilment,
      createdAt: o.createdAt,
    })
    .from(o)
    .where(eq(o.channel, "whatsapp"))
    .orderBy(desc(o.createdAt))
    .limit(limit);
}
