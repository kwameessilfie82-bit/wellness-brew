import "server-only";

import { and, avg, count, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { productTable, reviewTable } from "@/db/schema";
import type { ProductRatingFacts } from "@/lib/seo/json-ld";

export type PublicReview = {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  title: string | null;
  body: string;
  date: string;
  productName?: string | null;
  productSlug?: string | null;
};

/** Approved reviews + average for one product (page is ISR; moderation revalidates it). */
export const getProductReviews = cache(async (productId: string): Promise<ProductRatingFacts & { items: PublicReview[] }> => {
  const where = and(eq(reviewTable.productId, productId), eq(reviewTable.status, "approved"));
  const [rows, [agg]] = await Promise.all([
    db
      .select({
        id: reviewTable.id,
        name: reviewTable.name,
        location: reviewTable.location,
        rating: reviewTable.rating,
        title: reviewTable.title,
        body: reviewTable.body,
        createdAt: reviewTable.createdAt,
      })
      .from(reviewTable)
      .where(where)
      .orderBy(desc(reviewTable.isFeatured), desc(reviewTable.createdAt))
      .limit(20),
    db.select({ n: count(), avg: avg(reviewTable.rating) }).from(reviewTable).where(where),
  ]);
  const items = rows.map((r) => ({ ...r, date: r.createdAt.toISOString() }));
  return {
    average: Number(agg?.avg ?? 0),
    count: Number(agg?.n ?? 0),
    reviews: items,
    items,
  };
});

/** Featured approved reviews for the homepage. */
export const getFeaturedReviews = cache(async (limit = 6): Promise<PublicReview[]> => {
  const rows = await db
    .select({
      id: reviewTable.id,
      name: reviewTable.name,
      location: reviewTable.location,
      rating: reviewTable.rating,
      title: reviewTable.title,
      body: reviewTable.body,
      createdAt: reviewTable.createdAt,
      productName: productTable.name,
      productSlug: productTable.slug,
    })
    .from(reviewTable)
    .leftJoin(productTable, eq(productTable.id, reviewTable.productId))
    .where(and(eq(reviewTable.status, "approved"), eq(reviewTable.isFeatured, true)))
    .orderBy(desc(reviewTable.createdAt))
    .limit(limit);
  return rows.map(({ createdAt, ...r }) => ({ ...r, date: createdAt.toISOString() }));
});
