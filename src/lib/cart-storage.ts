export const CART_STORAGE_KEY = "cart";
export const CART_CHECKOUT_BACKUP_KEY = "cart-checkout-backup";

export type StoredCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

export function readCartFromStorage(): StoredCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved) as StoredCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCartToStorage(items: StoredCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

/** Persist cart before OAuth so it survives the full-page redirect round-trip */
export function backupCartForCheckout(items: StoredCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  const payload = JSON.stringify(items);
  localStorage.setItem(CART_STORAGE_KEY, payload);
  sessionStorage.setItem(CART_CHECKOUT_BACKUP_KEY, payload);
}

export function restoreCartAfterAuth(): StoredCartItem[] {
  const fromLocal = readCartFromStorage();
  if (fromLocal.length > 0) {
    return fromLocal;
  }

  if (typeof window === "undefined") {
    return [];
  }

  try {
    const backup = sessionStorage.getItem(CART_CHECKOUT_BACKUP_KEY);
    if (!backup) {
      return [];
    }
    const parsed = JSON.parse(backup) as StoredCartItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }
    writeCartToStorage(parsed);
    sessionStorage.removeItem(CART_CHECKOUT_BACKUP_KEY);
    return parsed;
  } catch {
    return [];
  }
}

export function clearCheckoutCartBackup() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CART_CHECKOUT_BACKUP_KEY);
  }
}
