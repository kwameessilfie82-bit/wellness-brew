import { NextResponse } from "next/server";
import { db } from "@/db";
import { categoryTable, productTable } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const categories = await db.query.categoryTable.findMany({
      where: eq(categoryTable.isActive, true),
      orderBy: [asc(categoryTable.sortOrder), asc(categoryTable.name)],
    });

    // Get product counts grouped by category
    const counts = await db
      .select({
        categoryId: productTable.categoryId,
        count: sql<number>`count(*)`,
      })
      .from(productTable)
      .where(eq(productTable.isActive, true))
      .groupBy(productTable.categoryId);

    const categoryIdToCount = new Map<string, number>();
    for (const row of counts) {
      if (row.categoryId) categoryIdToCount.set(row.categoryId, Number(row.count));
    }

    const categoriesWithCounts = categories.map((c) => ({
      ...c,
      productCount: categoryIdToCount.get(c.id) ?? 0,
    }));

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}