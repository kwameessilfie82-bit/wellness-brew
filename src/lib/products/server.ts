import "server-only";

/**
 * Server-side catalogue reads for server components (product pages, shop,
 * home, sitemap, 404). Same visibility rules as /api/products: active
 * products in active (or no) categories. Reads are wrapped in React `cache()`
 * so generateMetadata and the page share one query per request.
 */
import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { categoryTable, inventoryTable, productTable } from "@/db/schema";

import { normalizeStoreProducts, type StoreProduct } from "./normalize";

const productColumns = {
  id: productTable.id,
  name: productTable.name,
  slug: productTable.slug,
  description: productTable.description,
  shortDescription: productTable.shortDescription,
  price: productTable.price,
  originalPrice: productTable.originalPrice,
  sku: productTable.sku,
  images: productTable.images,
  isFeatured: productTable.isFeatured,
  manufacturer: productTable.manufacturer,
  fdaRegNumber: productTable.fdaRegNumber,
  categoryId: productTable.categoryId,
  categoryName: categoryTable.name,
  categorySlug: categoryTable.slug,
  quantityAvailable: inventoryTable.quantityAvailable,
  seoTitle: productTable.seoTitle,
  seoDescription: productTable.seoDescription,
  updatedAt: productTable.updatedAt,
};

export type ServerProduct = StoreProduct & {
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date | null;
  categorySlug: string | null;
};

const visible = () =>
  and(eq(productTable.isActive, true), or(eq(categoryTable.isActive, true), sql`${categoryTable.id} IS NULL`))!;

function baseQuery(where: SQL) {
  return db
    .select(productColumns)
    .from(productTable)
    .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
    .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
    .where(where);
}

function toServerProducts(rows: Awaited<ReturnType<typeof baseQuery>>): ServerProduct[] {
  const normalized = normalizeStoreProducts(rows as unknown as Record<string, unknown>[]);
  return normalized.map((p, i) => ({
    ...p,
    seoTitle: rows[i].seoTitle ?? null,
    seoDescription: rows[i].seoDescription ?? null,
    updatedAt: rows[i].updatedAt ?? null,
    categorySlug: rows[i].categorySlug ?? null,
  }));
}

export const getProductBySlug = cache(async (slug: string): Promise<ServerProduct | null> => {
  const rows = await baseQuery(and(visible(), eq(productTable.slug, slug))!).limit(1);
  return toServerProducts(rows)[0] ?? null;
});

export const getProductById = cache(async (id: string): Promise<ServerProduct | null> => {
  const rows = await baseQuery(and(visible(), eq(productTable.id, id))!).limit(1);
  return toServerProducts(rows)[0] ?? null;
});

export const getRelatedProducts = cache(
  async (productId: string, categoryId: string | null, limit = 4): Promise<StoreProduct[]> => {
    if (!categoryId) return [];
    const rows = await baseQuery(
      and(visible(), eq(productTable.categoryId, categoryId), ne(productTable.id, productId))!,
    )
      .orderBy(desc(productTable.isFeatured), desc(productTable.createdAt))
      .limit(limit);
    return toServerProducts(rows);
  },
);

/** Featured first, topped up with the newest active products. */
export const getFeaturedProducts = cache(async (limit = 4): Promise<StoreProduct[]> => {
  const rows = await baseQuery(visible())
    .orderBy(desc(productTable.isFeatured), desc(productTable.createdAt))
    .limit(limit);
  return toServerProducts(rows);
});

/** Every indexable product, for generateStaticParams + the sitemap. */
export const getActiveProductSlugs = cache(
  async (): Promise<{ slug: string; updatedAt: Date; images: string[] }[]> => {
    const rows = await db
      .select({ slug: productTable.slug, updatedAt: productTable.updatedAt, images: productTable.images })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(visible())
      .orderBy(desc(productTable.updatedAt));
    return rows.map((r) => ({
      slug: r.slug,
      updatedAt: r.updatedAt,
      images: normalizeStoreProducts([{ images: r.images }])[0].images,
    }));
  },
);

export type ShopCategory = { name: string; slug: string; description: string | null };

export const getActiveCategories = cache(async (): Promise<ShopCategory[]> => {
  return db
    .select({ name: categoryTable.name, slug: categoryTable.slug, description: categoryTable.description })
    .from(categoryTable)
    .where(eq(categoryTable.isActive, true))
    .orderBy(asc(categoryTable.sortOrder), asc(categoryTable.name));
});

/** Category by slug or name, matching /api/products' lookup. */
export const findCategory = cache(async (value: string): Promise<(ShopCategory & { id: string }) | null> => {
  const [row] = await db
    .select({
      id: categoryTable.id,
      name: categoryTable.name,
      slug: categoryTable.slug,
      description: categoryTable.description,
    })
    .from(categoryTable)
    .where(or(eq(categoryTable.slug, value), ilike(categoryTable.name, `%${value}%`)))
    .limit(1);
  return row ?? null;
});

export type ProductsPage = {
  products: StoreProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

/** Same filters/order/pagination as GET /api/products. */
export const getProductsPage = cache(
  async (opts: { category?: string | null; search?: string | null; page?: number; limit?: number }): Promise<ProductsPage> => {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts.limit ?? 12));
    const conditions: SQL[] = [visible()];

    if (opts.category && opts.category !== "all") {
      const category = await findCategory(opts.category);
      if (category) conditions.push(eq(productTable.categoryId, category.id));
    }
    if (opts.search) {
      const pattern = `%${opts.search}%`;
      conditions.push(
        or(
          ilike(productTable.name, pattern),
          ilike(productTable.sku, pattern),
          ilike(productTable.shortDescription, pattern),
          ilike(productTable.description, pattern),
        )!,
      );
    }

    const where = and(...conditions)!;
    const [rows, countRows] = await Promise.all([
      baseQuery(where)
        .orderBy(desc(productTable.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`count(*)` })
        .from(productTable)
        .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
        .where(where),
    ]);
    const total = Number(countRows[0]?.count ?? 0);
    return {
      products: toServerProducts(rows),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },
);
