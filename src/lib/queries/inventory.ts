import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  categoryTable,
  inventoryTable,
  productTable,
} from "@/db/schema";

/**
 * Keep only the first thumbnail for list responses. Uploaded images are stored
 * inline as compressed base64 `data:` URLs, so those are passed through (the
 * admin uploader caps them to ~400KB); http(s)/site paths are kept as-is.
 */
export function toListImageJson(imagesJson: string | null | undefined): string {
  if (!imagesJson) {
    return "[]";
  }
  try {
    const parsed = JSON.parse(imagesJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return "[]";
    }
    const first = parsed[0];
    if (
      typeof first === "string" &&
      (first.startsWith("http://") ||
        first.startsWith("https://") ||
        first.startsWith("/") ||
        first.startsWith("data:"))
    ) {
      return JSON.stringify([first]);
    }
    return '["/placeholder.svg"]';
  } catch {
    return "[]";
  }
}

export type InventoryListParams = {
  categoryId?: string | null;
  limit: number;
  page: number;
  search?: string | null;
  status?: string | null;
};

export async function fetchInventoryList(params: InventoryListParams) {
  const { categoryId, limit, page, search, status } = params;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [eq(categoryTable.isActive, true)];

  if (categoryId) {
    conditions.push(eq(productTable.categoryId, categoryId));
  }

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(productTable.name, term), ilike(productTable.sku, term))!,
    );
  }

  if (status === "low-stock") {
    conditions.push(gt(inventoryTable.quantityInStock, 0));
    conditions.push(
      lte(inventoryTable.quantityInStock, inventoryTable.lowStockThreshold),
    );
  } else if (status === "out-of-stock") {
    conditions.push(eq(inventoryTable.quantityInStock, 0));
  } else if (status === "in-stock") {
    conditions.push(gt(inventoryTable.quantityInStock, 0));
    conditions.push(
      gt(inventoryTable.quantityInStock, inventoryTable.lowStockThreshold),
    );
  }

  const whereClause = and(...conditions);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        productId: productTable.id,
        name: productTable.name,
        sku: productTable.sku,
        slug: productTable.slug,
        categoryId: productTable.categoryId,
        price: productTable.price,
        isActive: productTable.isActive,
        createdAt: productTable.createdAt,
        updatedAt: productTable.updatedAt,
        images: productTable.images,
        categoryName: categoryTable.name,
        categoryIsActive: categoryTable.isActive,
        inventoryId: inventoryTable.id,
        quantityInStock: inventoryTable.quantityInStock,
        quantityReserved: inventoryTable.quantityReserved,
        quantityAvailable: inventoryTable.quantityAvailable,
        lowStockThreshold: inventoryTable.lowStockThreshold,
        reorderPoint: inventoryTable.reorderPoint,
        reorderQuantity: inventoryTable.reorderQuantity,
        lastRestocked: inventoryTable.lastRestocked,
        lastCounted: inventoryTable.lastCounted,
        inventoryCreatedAt: inventoryTable.createdAt,
        inventoryUpdatedAt: inventoryTable.updatedAt,
      })
      .from(productTable)
      .innerJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
      .where(whereClause)
      .orderBy(desc(productTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(productTable)
      .innerJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
      .where(whereClause),
  ]);

  const products = rows.map((row) => ({
    id: row.productId,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    categoryId: row.categoryId,
    price: row.price,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    images: toListImageJson(row.images),
    category: {
      id: row.categoryId,
      name: row.categoryName,
      isActive: row.categoryIsActive,
    },
    inventory: row.inventoryId
      ? {
          id: row.inventoryId,
          productId: row.productId,
          quantityInStock: row.quantityInStock ?? 0,
          quantityReserved: row.quantityReserved ?? 0,
          quantityAvailable: row.quantityAvailable ?? 0,
          lowStockThreshold: row.lowStockThreshold ?? 10,
          reorderPoint: row.reorderPoint ?? 5,
          reorderQuantity: row.reorderQuantity ?? 50,
          lastRestocked: row.lastRestocked,
          lastCounted: row.lastCounted,
          createdAt: row.inventoryCreatedAt!,
          updatedAt: row.inventoryUpdatedAt!,
          notes: null,
        }
      : null,
  }));

  const total = Number(totalRow[0]?.total ?? 0);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function fetchInventoryStats() {
  const rows = await db
    .select({
      quantityInStock: inventoryTable.quantityInStock,
      lowStockThreshold: inventoryTable.lowStockThreshold,
    })
    .from(inventoryTable)
    .innerJoin(productTable, eq(inventoryTable.productId, productTable.id))
    .innerJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
    .where(eq(categoryTable.isActive, true));

  let lowStockItems = 0;
  let outOfStockItems = 0;
  let inStockItems = 0;

  for (const row of rows) {
    const stock = row.quantityInStock ?? 0;
    const threshold = row.lowStockThreshold ?? 10;
    if (stock <= 0) {
      outOfStockItems++;
    } else if (stock <= threshold) {
      lowStockItems++;
    } else {
      inStockItems++;
    }
  }

  return {
    totalProducts: rows.length,
    lowStockItems,
    outOfStockItems,
    inStockItems,
  };
}
