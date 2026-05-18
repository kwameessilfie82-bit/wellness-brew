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
