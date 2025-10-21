import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { categoryTable, inventoryTransactionTable, productTable } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

// GET /api/admin/analytics/sales
// Query params:
//   range: e.g. 7d, 30d, 90d, 365d (default 90d)
//   limit: top N products (default 10)
//   categoryId: optional filter
const getHandler = withAdminAuth(
  async (request: NextRequest) => {
    try {
      // Safe URL construction
      let searchParams: URLSearchParams;
      try {
        if (!request.url) {
          throw new Error("Request URL is undefined");
        }
        
        let url: URL;
        if (request.url.startsWith('http')) {
          url = new URL(request.url);
        } else {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          url = new URL(request.url, baseUrl);
        }
        searchParams = url.searchParams;
      } catch (urlError) {
        console.error("❌ URL construction failed in analytics API:", urlError);
        return NextResponse.json(
          { error: "Invalid request URL" },
          { status: 400 }
        );
      }
      
      const range = (searchParams.get("range") || "90d").toLowerCase();
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const categoryId = searchParams.get("categoryId");

      // Resolve date range
      const now = new Date();
      const daysMatch = range.match(/(\d+)d/);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : 90;
      const from = new Date(now);
      from.setDate(now.getDate() - days);

      // Common filters
      const baseWhere = [
        gte(inventoryTransactionTable.createdAt, from),
        lte(inventoryTransactionTable.createdAt, now),
        // sales are stock out
        eq(inventoryTransactionTable.type, "out"),
      ];

      // Optional product/category filter
      const productWhere = categoryId ? eq(productTable.categoryId, categoryId) : undefined;
      const whereClause = productWhere ? and(...baseWhere, productWhere) : and(...baseWhere);

      // Sanity check: ensure table is accessible
      try {
        await db.select({ c: sql<number>`count(*)` }).from(inventoryTransactionTable).limit(1);
      } catch (schemaErr) {
        const message = schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
        return NextResponse.json({ error: `Inventory transactions unavailable: ${message}` }, { status: 500 });
      }

      // Time series: revenue and units by day
      let timeSeries: { day: string; units: number; revenue: number }[] = [];
      try {
        timeSeries = await db
          .select({
            day: sql<string>`date_trunc('day', ${inventoryTransactionTable.createdAt})`,
            units: sql<number>`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN -${inventoryTransactionTable.quantity} ELSE 0 END)`,
            revenue: sql<number>`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN (-${inventoryTransactionTable.quantity} * ${productTable.price}) ELSE 0 END)`,
          })
          .from(inventoryTransactionTable)
          .leftJoin(productTable, eq(inventoryTransactionTable.productId, productTable.id))
          .where(whereClause)
          .groupBy(sql`date_trunc('day', ${inventoryTransactionTable.createdAt})`)
          .orderBy(sql`date_trunc('day', ${inventoryTransactionTable.createdAt}) ASC`);
      } catch (e) {
        console.error("analytics timeSeries failed", e);
        timeSeries = [];
      }

      // Top products by units and revenue
      let topProducts: { productId: string; name: string; categoryId: string | null; units: number; revenue: number }[] = [];
      try {
        const rawTopProducts = await db
          .select({
            productId: productTable.id,
            name: productTable.name,
            categoryId: productTable.categoryId,
            units: sql<number>`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN -${inventoryTransactionTable.quantity} ELSE 0 END)`,
            revenue: sql<number>`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN (-${inventoryTransactionTable.quantity} * ${productTable.price}) ELSE 0 END)`,
          })
          .from(inventoryTransactionTable)
          .leftJoin(productTable, eq(inventoryTransactionTable.productId, productTable.id))
          .where(whereClause)
          .groupBy(productTable.id, productTable.name, productTable.categoryId)
          .orderBy(sql`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN (-${inventoryTransactionTable.quantity} * ${productTable.price}) ELSE 0 END) DESC`)
          .limit(limit);
        
        // Filter out null values and ensure type safety
        topProducts = rawTopProducts
          .filter((product): product is { productId: string; name: string; categoryId: string | null; units: number; revenue: number } => 
            product.productId !== null && product.name !== null
          )
          .map(product => ({
            productId: product.productId!,
            name: product.name!,
            categoryId: product.categoryId,
            units: product.units,
            revenue: product.revenue
          }));
      } catch (e) {
        console.error("analytics topProducts failed", e);
        topProducts = [];
      }

      // Category share (pie)
      let byCategory: { categoryId: string | null; categoryName: string | null; units: number; revenue: number }[] = [];
      try {
        byCategory = await db
          .select({
            categoryId: categoryTable.id,
            categoryName: categoryTable.name,
            units: sql<number>`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN -${inventoryTransactionTable.quantity} ELSE 0 END)`,
            revenue: sql<number>`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN (-${inventoryTransactionTable.quantity} * ${productTable.price}) ELSE 0 END)`,
          })
          .from(inventoryTransactionTable)
          .leftJoin(productTable, eq(inventoryTransactionTable.productId, productTable.id))
          .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
          .where(whereClause)
          .groupBy(categoryTable.id, categoryTable.name)
          .orderBy(sql`SUM(CASE WHEN ${inventoryTransactionTable.quantity} < 0 THEN (-${inventoryTransactionTable.quantity} * ${productTable.price}) ELSE 0 END) DESC`);
      } catch (e) {
        console.error("analytics byCategory failed", e);
        byCategory = [];
      }

      // Totals
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

export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return getHandler(request);
}


