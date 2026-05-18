import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { categoryTable, inventoryTable, productTable } from "@/db/schema";
import { mapProductsResponse } from "@/lib/api/products";

export async function searchStoreProducts(query: string, limit = 8) {
  const term = query.trim();
  if (!term) {
    return [];
  }

  const pattern = `%${term}%`;
  const conditions = and(
    eq(productTable.isActive, true),
    or(
      eq(categoryTable.isActive, true),
      sql`${categoryTable.id} IS NULL`,
    )!,
    or(
      ilike(productTable.name, pattern),
      ilike(productTable.sku, pattern),
      ilike(productTable.shortDescription, pattern),
      ilike(productTable.description, pattern),
      ilike(categoryTable.name, pattern),
    )!,
  );

  const rows = await db
    .select({
      id: productTable.id,
      name: productTable.name,
      slug: productTable.slug,
      description: productTable.description,
      shortDescription: productTable.shortDescription,
      price: productTable.price,
      originalPrice: productTable.originalPrice,
      sku: productTable.sku,
      barcode: productTable.barcode,
      images: productTable.images,
      isActive: productTable.isActive,
      isFeatured: productTable.isFeatured,
      manufacturer: productTable.manufacturer,
      categoryId: productTable.categoryId,
      categoryName: categoryTable.name,
      createdAt: productTable.createdAt,
      updatedAt: productTable.updatedAt,
      createdBy: productTable.createdBy,
      quantityAvailable: inventoryTable.quantityAvailable,
    })
    .from(productTable)
    .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
    .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
    .where(conditions)
    .orderBy(desc(productTable.isFeatured), desc(productTable.createdAt))
    .limit(limit);

  return mapProductsResponse(rows as Record<string, unknown>[]);
}
