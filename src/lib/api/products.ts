import "server-only";

import { normalizeStoreProducts } from "@/lib/products/normalize";

export function mapProductsResponse(products: Record<string, unknown>[]) {
  return normalizeStoreProducts(products);
}
