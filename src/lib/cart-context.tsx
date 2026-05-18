"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

import { parsePrice } from "@/lib/format";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

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
  cart: CartItem[]; // Keep for backward compatibility
  addToCart: (product: ProductInput) => void;
  removeFromCart: (id: string | number) => void;
  removeItem: (id: string | number) => void; // Alias for removeFromCart
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  totalPrice: number; // Alias for total
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load cart", e);
      }
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, mounted]);

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
    setItems((prev) => prev.filter((item) => item.id !== String(id) && item.id !== id));
  };

  const updateQuantity = (id: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prev) => 
      prev.map((item) => 
        (item.id === String(id) || item.id === id) 
          ? { ...item, quantity } 
          : item
      )
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
        cart: items, // Backward compatibility
        addToCart, 
        removeFromCart,
        removeItem: removeFromCart, // Alias
        updateQuantity,
        clearCart, 
        total,
        totalPrice: total, // Alias
        totalItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
