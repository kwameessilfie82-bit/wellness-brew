"use server";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { productTable } from "@/db/schema";
import { getProductThumbnail, parsePrice } from "@/lib/format";

export type CartProductInfo = { id: string; name: string; price: number; image?: string };

/**
 * Current catalogue info for the ids in a stored cart. Products that were
 * deleted or switched off are simply absent, so the cart can drop them.
 */
export async function refreshCartItems(ids: string[]): Promise<CartProductInfo[]> {
  const clean = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 64))].slice(0, 100);
  if (clean.length === 0) return [];
  const rows = await db
    .select({
      id: productTable.id,
      name: productTable.name,
      price: productTable.price,
      images: productTable.images,
      isActive: productTable.isActive,
    })
    .from(productTable)
    .where(inArray(productTable.id, clean));
  return rows
    .filter((r) => r.isActive)
    .map((r) => ({
      id: r.id,
      name: r.name.trim(),
      price: parsePrice(r.price),
      image: getProductThumbnail(r.images),
    }));
}
