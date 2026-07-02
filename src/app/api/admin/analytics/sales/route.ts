import { NextRequest, NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { categoryTable, invoiceItemTable, invoiceTable } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

// GET /api/admin/analytics/sales
// Aggregates revenue/units from SAVED INVOICES (the invoice generator).
// Query params:
//   range: e.g. 7d, 30d, 90d, 365d (default 90d)
//   limit: top N products (default 10)
//   categoryId: optional filter
const getHandler = withAdminAuth(
  async (request: NextRequest) => {
    try {
      let searchParams: URLSearchParams;
      try {
        const url = request.url.startsWith("http")
          ? new URL(request.url)
          : new URL(request.url, getAppBaseUrl(request));
        searchParams = url.searchParams;
      } catch (urlError) {
        console.error("❌ URL construction failed in analytics API:", urlError);
        return NextResponse.json({ error: "Invalid request URL" }, { status: 400 });
      }

      const range = (searchParams.get("range") || "90d").toLowerCase();
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const categoryId = searchParams.get("categoryId");

      const now = new Date();
      const daysMatch = range.match(/(\d+)d/);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : 90;
      const from = new Date(now);
      from.setDate(now.getDate() - days);

      const baseWhere = [
        gte(invoiceTable.invoiceDate, from),
        lte(invoiceTable.invoiceDate, now),
      ];
      const whereClause = categoryId
        ? and(...baseWhere, eq(invoiceItemTable.categoryId, categoryId))
        : and(...baseWhere);

      const units = sql<number>`COALESCE(SUM(${invoiceItemTable.quantity}), 0)`;
      const revenue = sql<number>`COALESCE(SUM(${invoiceItemTable.lineTotal}), 0)`;

      // Time series: revenue and units by day
      let timeSeries: { day: string; units: number; revenue: number }[] = [];
      try {
        timeSeries = await db
          .select({
            day: sql<string>`to_char(date_trunc('day', ${invoiceTable.invoiceDate}), 'YYYY-MM-DD')`,
            units,
            revenue,
          })
          .from(invoiceItemTable)
          .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
          .where(whereClause)
          .groupBy(sql`date_trunc('day', ${invoiceTable.invoiceDate})`)
          .orderBy(sql`date_trunc('day', ${invoiceTable.invoiceDate}) ASC`);
      } catch (e) {
        console.error("analytics timeSeries failed", e);
        timeSeries = [];
      }

      // Top products by revenue
      let topProducts: {
        productId: string | null;
        name: string;
        categoryId: string | null;
        units: number;
        revenue: number;
      }[] = [];
      try {
        const raw = await db
          .select({
            productId: invoiceItemTable.productId,
            name: invoiceItemTable.productName,
            categoryId: invoiceItemTable.categoryId,
            units,
            revenue,
          })
          .from(invoiceItemTable)
          .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
          .where(whereClause)
          .groupBy(
            invoiceItemTable.productId,
            invoiceItemTable.productName,
            invoiceItemTable.categoryId,
          )
          .orderBy(sql`${revenue} DESC`)
          .limit(limit);
        topProducts = raw.map((r) => ({
          productId: r.productId,
          name: r.name,
          categoryId: r.categoryId,
          units: Number(r.units || 0),
          revenue: Number(r.revenue || 0),
        }));
      } catch (e) {
        console.error("analytics topProducts failed", e);
        topProducts = [];
      }

      // Category share
      let byCategory: {
        categoryId: string | null;
        categoryName: string | null;
        units: number;
        revenue: number;
      }[] = [];
      try {
        byCategory = await db
          .select({
            categoryId: invoiceItemTable.categoryId,
            categoryName: categoryTable.name,
            units,
            revenue,
          })
          .from(invoiceItemTable)
          .innerJoin(invoiceTable, eq(invoiceItemTable.invoiceId, invoiceTable.id))
          .leftJoin(categoryTable, eq(invoiceItemTable.categoryId, categoryTable.id))
          .where(whereClause)
          .groupBy(invoiceItemTable.categoryId, categoryTable.name)
          .orderBy(sql`${revenue} DESC`);
      } catch (e) {
        console.error("analytics byCategory failed", e);
        byCategory = [];
      }

      const totals = timeSeries.reduce(
        (acc, row) => {
          acc.units += Number(row.units || 0);
          acc.revenue += Number(row.revenue || 0);
          return acc;
        },
        { units: 0, revenue: 0 },
      );

      return NextResponse.json({
        rangeDays: days,
        from,
        to: now,
        totals,
        series: timeSeries.map((r) => ({
          day: r.day,
          units: Number(r.units || 0),
          revenue: Number(r.revenue || 0),
        })),
        topProducts: topProducts.map((r) => ({
          productId: r.productId,
          name: r.name,
          categoryId: r.categoryId,
          units: Number(r.units || 0),
          revenue: Number(r.revenue || 0),
        })),
        byCategory: byCategory.map((r) => ({
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          units: Number(r.units || 0),
          revenue: Number(r.revenue || 0),
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error computing sales analytics:", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  ["canViewAnalytics", "canManageInventory", "canManageProducts"],
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return getHandler(request);
}
