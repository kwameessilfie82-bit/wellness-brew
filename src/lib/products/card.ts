import type { StoreProduct } from "./normalize";

/** The minimal, serialisable shape ProductCard needs (keeps client payloads small). */
export function toCardProduct(p: StoreProduct) {
  return {
    id: p.id,
    slug: p.slug || undefined,
    name: p.name,
    price: p.price,
    image: p.image,
    description: p.shortDescription || p.description || undefined,
    category: p.categoryName || undefined,
    fdaRegNumber: p.fdaRegNumber || undefined,
  };
}
