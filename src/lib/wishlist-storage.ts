export const WISHLIST_STORAGE_KEY = "wishlist";

export type StoredWishlistItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
};

export function readWishlistFromStorage(): StoredWishlistItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved) as StoredWishlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWishlistToStorage(items: StoredWishlistItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
}
