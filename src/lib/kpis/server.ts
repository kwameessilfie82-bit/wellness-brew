import "server-only";

import { and, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { kpiEntryTable, siteEventTable } from "@/db/schema";
import { STOCK_HELD } from "@/lib/orders/status";

import { addWeeks } from "./config";

/** Manual values by week: { "2026-10-19": { "instagram.reach": 1200 } } */
export type KpiWeeks = Record<string, Record<string, number>>;

export const AUTO_EVENTS = [
  "whatsapp_click",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "order_placed",
  "generate_lead",
  "review_submitted",
] as const;

export type AutoWeek = {
  orders: number;
  revenue: number;
  repeatOrders: number;
} & Record<(typeof AUTO_EVENTS)[number], number>;

export type AbRow = { variant: string; views: number; clicks: number };

const emptyAuto = (): AutoWeek => ({
  orders: 0,
  revenue: 0,
  repeatOrders: 0,
  whatsapp_click: 0,
  view_item: 0,
  add_to_cart: 0,
  begin_checkout: 0,
  order_placed: 0,
  generate_lead: 0,
  review_submitted: 0,
});

/** Manual KPI entries for weeks fromWeek..toWeek (inclusive Mondays). */
export async function getKpiWeeks(fromWeek: string, toWeek: string): Promise<KpiWeeks> {
  const rows = await db
    .select({ week: kpiEntryTable.weekStart, metric: kpiEntryTable.metric, value: kpiEntryTable.value })
    .from(kpiEntryTable)
    .where(and(gte(kpiEntryTable.weekStart, fromWeek), sql`${kpiEntryTable.weekStart} <= ${toWeek}`));
  const out: KpiWeeks = {};
  for (const r of rows) (out[r.week] ??= {})[r.metric] = Number(r.value);
  return out;
}

/** Website-derived metrics per week (zero-filled), one grouped query each. */
export async function getAutoMetrics(fromWeek: string, toWeek: string): Promise<Record<string, AutoWeek>> {
  const from = `${fromWeek}T00:00:00Z`;
  const to = `${addWeeks(toWeek, 1)}T00:00:00Z`; // exclusive
  const held = sql.join(
    STOCK_HELD.map((s) => sql`${s}`),
    sql`, `,
  );

  const [orderRows, eventRows] = await Promise.all([
    db.execute<{ week: string; orders: number; revenue: string | null; repeat_orders: number }>(sql`
      select
        to_char(date_trunc('week', o.created_at), 'YYYY-MM-DD') as week,
        count(*)::int as orders,
        coalesce(sum(o.total) filter (where o.status in (${held})), 0) as revenue,
        (count(*) filter (where o.customer_phone_e164 is not null and exists (
          select 1 from store_order p
          where p.customer_phone_e164 = o.customer_phone_e164
            and p.created_at < o.created_at
            and p.status <> 'expired'
        )))::int as repeat_orders
      from store_order o
      where o.status <> 'expired'
        and o.created_at >= ${from}::timestamp and o.created_at < ${to}::timestamp
      group by 1
    `),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${siteEventTable.createdAt}), 'YYYY-MM-DD')`,
        name: siteEventTable.name,
        n: sql<number>`count(*)::int`,
      })
      .from(siteEventTable)
      .where(
        and(
          inArray(siteEventTable.name, [...AUTO_EVENTS]),
          sql`${siteEventTable.createdAt} >= ${from}::timestamp`,
          sql`${siteEventTable.createdAt} < ${to}::timestamp`,
        ),
      )
      .groupBy(sql`1`, siteEventTable.name),
  ]);

  const out: Record<string, AutoWeek> = {};
  for (let w = fromWeek; w <= toWeek; w = addWeeks(w, 1)) out[w] = emptyAuto();
  const orders = ((orderRows as unknown as { rows?: unknown[] }).rows ?? orderRows) as {
    week: string;
    orders: number;
    revenue: string | null;
    repeat_orders: number;
  }[];
  for (const r of orders) {
    const w = out[r.week];
    if (!w) continue;
    w.orders = Number(r.orders);
    w.revenue = Number(r.revenue ?? 0);
    w.repeatOrders = Number(r.repeat_orders);
  }
  for (const r of eventRows) {
    const w = out[r.week];
    if (w && (AUTO_EVENTS as readonly string[]).includes(r.name)) w[r.name as (typeof AUTO_EVENTS)[number]] = Number(r.n);
  }
  return out;
}

/** Homepage headline A/B counts over fromWeek..toWeek (inclusive weeks). */
export async function getAbResults(fromWeek: string, toWeek: string): Promise<AbRow[]> {
  const rows = await db
    .select({
      variant: siteEventTable.variant,
      views: sql<number>`(count(*) filter (where ${siteEventTable.name} = 'hero_view'))::int`,
      clicks: sql<number>`(count(*) filter (where ${siteEventTable.name} = 'hero_cta'))::int`,
    })
    .from(siteEventTable)
    .where(
      and(
        inArray(siteEventTable.name, ["hero_view", "hero_cta"]),
        sql`${siteEventTable.createdAt} >= ${`${fromWeek}T00:00:00Z`}::timestamp`,
        lt(siteEventTable.createdAt, new Date(`${addWeeks(toWeek, 1)}T00:00:00Z`)),
      ),
    )
    .groupBy(siteEventTable.variant);
  return rows.filter((r) => r.variant).map((r) => ({ variant: r.variant as string, views: Number(r.views), clicks: Number(r.clicks) }));
}
