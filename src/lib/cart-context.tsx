"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { toast } from "sonner";

import { refreshCartItems } from "@/app/order/cart-actions";
import { parsePrice } from "@/lib/format";
import {
  readCartFromStorage,
  restoreCartAfterAuth,
  writeCartToStorage,
  type StoredCartItem,
} from "@/lib/cart-storage";

interface CartItem extends StoredCartItem {}

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
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const restored = restoreCartAfterAuth();
    const cart =
      restored.length > 0 ? restored : readCartFromStorage();
    setItems(cart);
    hasRestoredRef.current = true;
    setIsHydrated(true);

    // Reconcile with the live catalogue: drop products that were deleted or
    // switched off, and refresh names/prices/images that changed since.
    if (cart.length === 0) return;
    let cancelled = false;
    refreshCartItems(cart.map((i) => String(i.id)))
      .then((fresh) => {
        if (cancelled) return;
        const byId = new Map(fresh.map((p) => [p.id, p]));
        // Computed from the stored snapshot (not inside the updater, which may run twice).
        const removed = cart.filter((i) => !byId.has(String(i.id))).length;
        const repriced = cart.filter((i) => {
          const p = byId.get(String(i.id));
          return p && Math.abs(p.price - i.price) > 0.004;
        });
        setItems((prev) => {
          const next: CartItem[] = [];
          for (const item of prev) {
            const p = byId.get(String(item.id));
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

  useEffect(() => {
    if (!hasRestoredRef.current) {
      return;
    }
    writeCartToStorage(items);
  }, [items]);

  const addToCart = (product: ProductInput) => {
    const productId = String(product.id);
    let toastTitle = "Added to cart";
    let toastDescription = product.name;

    setItems((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        const nextQuantity = existing.quantity + 1;
        toastTitle = "Cart updated";
        toastDescription = `${product.name} · Qty ${nextQuantity}`;
        return prev.map((item) =>
          item.id === productId
            ? { ...item, quantity: nextQuantity }
            : item,
        );
      }

      const newItem: CartItem = {
        id: productId,
        name: product.name,
        price: parsePrice(
          product.price ?? product.customerPrice ?? product.retailPrice ?? 0,
        ),
        quantity: 1,
        image: product.image,
      };
      return [...prev, newItem];
    });

    toast.success(toastTitle, {
      id: `cart-${productId}`,
      description: toastDescription,
    });
  };

  const removeFromCart = (id: string | number) => {
    setItems((prev) =>
      prev.filter((item) => item.id !== String(id) && item.id !== id),
    );
  };

  const updateQuantity = (id: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === String(id) || item.id === id
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
