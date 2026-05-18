import {
  getProductThumbnail,
  parsePrice,
  parseProductImages,
} from "@/lib/format";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  originalPrice: number | null;
  sku: string;
  images: string[];
  image: string;
  categoryId: string | null;
  categoryName: string | null;
  quantityAvailable: number;
  isFeatured: boolean;
  manufacturer: string | null;
};

function listFriendlyImages(images: unknown): string[] {
  return parseProductImages(images).filter(
    (src) =>
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("/"),
  );
}

export function normalizeStoreProduct(
  raw: Record<string, unknown>,
): StoreProduct {
  const images = listFriendlyImages(raw.images);

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    description: raw.description ? String(raw.description) : null,
    shortDescription: raw.shortDescription
      ? String(raw.shortDescription)
      : null,
    price: parsePrice(raw.price),
    originalPrice: raw.originalPrice
      ? parsePrice(raw.originalPrice)
      : null,
    sku: String(raw.sku ?? ""),
    images,
    image: getProductThumbnail(raw.images),
    categoryId: raw.categoryId ? String(raw.categoryId) : null,
    categoryName: raw.categoryName ? String(raw.categoryName) : null,
    quantityAvailable: Number(raw.quantityAvailable ?? 0),
    isFeatured: Boolean(raw.isFeatured),
    manufacturer: raw.manufacturer ? String(raw.manufacturer) : null,
  };
}

export function normalizeStoreProducts(
  rows: Record<string, unknown>[],
): StoreProduct[] {
  return rows.map(normalizeStoreProduct);
}
