import "server-only";

import { and, count, desc, eq, lte, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { postTable } from "@/db/schema";

const isLive = () => and(eq(postTable.status, "published"), lte(postTable.publishedAt, new Date()));

/** `words` is computed in SQL so list pages don't ship full bodies. */
export const getPublishedPosts = cache(async ({ page = 1, limit = 12 }: { page?: number; limit?: number } = {}) => {
  const offset = (Math.max(1, page) - 1) * limit;
  const [posts, [totalRow]] = await Promise.all([
    db
      .select({
        id: postTable.id,
        slug: postTable.slug,
        title: postTable.title,
        excerpt: postTable.excerpt,
        coverUrl: postTable.coverUrl,
        publishedAt: postTable.publishedAt,
        words: sql<number>`coalesce(array_length(regexp_split_to_array(btrim(${postTable.body}), '\\s+'), 1), 0)`.mapWith(Number),
      })
      .from(postTable)
      .where(isLive())
      .orderBy(desc(postTable.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(postTable).where(isLive()),
  ]);
  return { posts, total: totalRow?.n ?? 0 };
});

export const getPostBySlug = cache(async (slug: string) => {
  const [post] = await db
    .select()
    .from(postTable)
    .where(and(eq(postTable.slug, slug), isLive()))
    .limit(1);
  return post ?? null;
});

export const getLatestPosts = cache(async (limit = 3) => {
  return db
    .select({
      id: postTable.id,
      slug: postTable.slug,
      title: postTable.title,
      excerpt: postTable.excerpt,
      coverUrl: postTable.coverUrl,
      publishedAt: postTable.publishedAt,
    })
    .from(postTable)
    .where(isLive())
    .orderBy(desc(postTable.publishedAt))
    .limit(limit);
});

export const getPublishedPostSlugs = cache(async () => {
  return db
    .select({ slug: postTable.slug, updatedAt: postTable.updatedAt })
    .from(postTable)
    .where(isLive());
});
