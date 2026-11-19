import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Invalidate every public surface that renders catalogue data (products,
 * categories, prices, stock). Call after any successful admin mutation so the
 * storefront never shows stale prices or availability.
 */
export function revalidateCatalog(): void {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}
