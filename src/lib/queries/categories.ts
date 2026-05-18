import "server-only";

import { asc, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categoryTable, productTable } from "@/db/schema";

export async function fetchCategoriesForInventory() {
  return db
    .select({
      id: categoryTable.id,
      name: categoryTable.name,
      slug: categoryTable.slug,
      description: categoryTable.description,
      image: categoryTable.image,
      isActive: categoryTable.isActive,
      sortOrder: categoryTable.sortOrder,
      createdAt: categoryTable.createdAt,
      updatedAt: categoryTable.updatedAt,
      createdBy: categoryTable.createdBy,
      productCount: sql<number>`count(${productTable.id})::int`,
    })
    .from(categoryTable)
    .leftJoin(productTable, eq(productTable.categoryId, categoryTable.id))
    .where(eq(categoryTable.isActive, true))
    .groupBy(categoryTable.id)
    .orderBy(asc(categoryTable.name));
}

export async function fetchAllCategoriesWithCounts() {
  const categories = await db.query.categoryTable.findMany({
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });

  const counts = await db
    .select({
      categoryId: productTable.categoryId,
      count: count(),
    })
    .from(productTable)
    .groupBy(productTable.categoryId);

  const countMap = new Map<string, number>();
  for (const row of counts) {
    if (row.categoryId) {
      countMap.set(row.categoryId, Number(row.count));
    }
  }

  return categories.map((category) => ({
    ...category,
    productCount: countMap.get(category.id) ?? 0,
  }));
}
