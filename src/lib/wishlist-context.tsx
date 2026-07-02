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
  readWishlistFromStorage,
  writeWishlistToStorage,
  type StoredWishlistItem,
} from "@/lib/wishlist-storage";

interface WishlistItem extends StoredWishlistItem {}

interface ProductInput {
  id: string | number;
  name: string;
  price: number;
  image?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  isHydrated: boolean;
  addToWishlist: (product: ProductInput) => void;
  removeFromWishlist: (id: string | number) => void;
  toggleWishlist: (product: ProductInput) => void;
  isInWishlist: (id: string | number) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const wishlist = readWishlistFromStorage();
    setItems(wishlist);
    hasRestoredRef.current = true;
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      return;
    }
    writeWishlistToStorage(items);
  }, [items]);

  const addToWishlist = (product: ProductInput) => {
    const productId = String(product.id);

    setItems((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.id === productId
            ? { ...item, name: product.name, price: parsePrice(product.price), image: product.image }
            : item,
        );
      }

      const newItem: WishlistItem = {
        id: productId,
        name: product.name,
        price: parsePrice(product.price),
        image: product.image,
      };
      return [...prev, newItem];
    });

    toast.success("Added to wishlist", {
      id: `wishlist-${productId}`,
      description: product.name,
    });
  };

  const removeFromWishlist = (id: string | number) => {
    const productId = String(id);
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const isInWishlist = (id: string | number) => {
    const productId = String(id);
    return items.some((item) => item.id === productId);
  };

  const toggleWishlist = (product: ProductInput) => {
    const productId = String(product.id);
    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
      toast.success("Removed from wishlist", {
        id: `wishlist-${productId}`,
        description: product.name,
      });
      return;
    }
    addToWishlist(product);
  };

  const clearWishlist = () => {
    setItems([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        isHydrated,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
