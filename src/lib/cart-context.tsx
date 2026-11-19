"use client";

import { track } from "@/lib/tracking/client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { refreshCartItems } from "@/app/order/cart-actions";
import { parsePrice } from "@/lib/format";
import { compareMoney } from "@/lib/orders/money";
import {
  readCartFromStorage,
  restoreCartAfterAuth,
  writeCartToStorage,
  type StoredCartItem,
} from "@/lib/cart-storage";

type CartItem = StoredCartItem;

interface ProductInput {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  customerPrice?: number;
  retailPrice?: number;
}

interface CartContextType {
  items: CartItem[];
  cart: CartItem[];
  isHydrated: boolean;
  addToCart: (product: ProductInput) => void;
  removeFromCart: (id: string | number) => void;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    const restored = restoreCartAfterAuth();
    const cart = restored.length > 0 ? restored : readCartFromStorage();
    // localStorage is only readable after mount; hydrating from it here is the
    // intended external-sync use of an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(cart);
    setIsHydrated(true);

    // Reconcile with the live catalogue: drop products that were deleted or
    // switched off, and refresh names/prices/images that changed since.
    if (cart.length === 0) return;
    let cancelled = false;
    const snapshotIds = new Set(cart.map((i) => String(i.id)));
    refreshCartItems([...snapshotIds])
      .then((fresh) => {
        if (cancelled) return;
        const byId = new Map(fresh.map((p) => [p.id, p]));
        // Computed from the stored snapshot (not inside the updater, which may run twice).
        const removed = cart.filter((i) => !byId.has(String(i.id))).length;
        const repriced = cart.filter((i) => {
          const p = byId.get(String(i.id));
          return p && compareMoney(p.price, i.price) !== 0;
        });
        setItems((prev) => {
          const next: CartItem[] = [];
          for (const item of prev) {
            const id = String(item.id);
            // Added after the snapshot was taken — not part of this check.
            if (!snapshotIds.has(id)) {
              next.push(item);
              continue;
            }
            const p = byId.get(id);
            if (!p) continue;
            next.push({ ...item, name: p.name, price: p.price, image: p.image ?? item.image });
          }
          return next;
        });
        if (repriced.length > 0) {
          toast.info(
            repriced.length === 1
              ? `The price of ${byId.get(String(repriced[0].id))?.name ?? "an item"} has changed. Your cart shows the current price.`
              : `Prices of ${repriced.length} items have changed. Your cart shows the current prices.`,
          );
        }
        if (removed > 0) {
          toast.info(
            removed === 1
              ? "An item in your cart is no longer available and was removed."
              : `${removed} items in your cart are no longer available and were removed.`,
          );
        }
      })
      .catch(() => {
        // Offline or server error: keep the cart; /order re-validates anyway.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist only after the stored cart has been applied to state. Gating on
  // state (not a ref) prevents the first, still-empty render from overwriting
  // localStorage — which wiped the cart under React StrictMode.
  useEffect(() => {
    if (!isHydrated) return;
    writeCartToStorage(items);
  }, [items, isHydrated]);

  const addToCart = useCallback((product: ProductInput) => {
    const productId = String(product.id);
    // Read from the rendered cart for the toast; never side-effect inside the updater.
    const existing = items.find((item) => item.id === productId);

    setItems((prev) => {
      const current = prev.find((item) => item.id === productId);
      if (current) {
        return prev.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          id: productId,
          name: product.name,
          price: parsePrice(
            product.price ?? product.customerPrice ?? product.retailPrice ?? 0,
          ),
          quantity: 1,
          image: product.image,
        },
      ];
    });

    track("add_to_cart", {
      productId,
      productName: product.name,
      value: parsePrice(product.price ?? product.customerPrice ?? product.retailPrice ?? 0),
    });
    toast.success(existing ? "Cart updated" : "Added to cart", {
      id: `cart-${productId}`,
      description: existing
        ? `${product.name} · Qty ${existing.quantity + 1}`
        : product.name,
    });
  }, [items]);

  const removeFromCart = useCallback((id: string | number) => {
    const key = String(id);
    setItems((prev) => prev.filter((item) => String(item.id) !== key));
  }, []);

  const updateQuantity = useCallback(
    (id: string | number, quantity: number) => {
      const key = String(id);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setItems((prev) => prev.filter((item) => String(item.id) !== key));
        return;
      }
      const qty = Math.floor(quantity);
      setItems((prev) =>
        prev.map((item) => (String(item.id) === key ? { ...item, quantity: qty } : item)),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextType>(() => {
    // Sum in pesewas to avoid float drift (e.g. 0.1 + 0.2).
    const totalMinor = items.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0,
    );
    const total = totalMinor / 100;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      items,
      cart: items,
      isHydrated,
      addToCart,
      removeFromCart,
      removeItem: removeFromCart,
      updateQuantity,
      clearCart,
      total,
      totalPrice: total,
      totalItems,
    };
  }, [items, isHydrated, addToCart, removeFromCart, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
