"use client";

import type React from "react";

import { Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/primitives/button";
import { FallbackImage } from "@/ui/components/fallback-image";

interface Product {
  id: number | string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card product-card-hover",
      )}
    >
      <Link
        href={`/shop/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-muted"
      >
        <FallbackImage
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
        {product.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
            {product.category}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur-sm transition-colors hover:bg-card"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isInWishlist(product.id) ? "fill-current text-red-500" : "text-foreground",
            )}
          />
          <span className="sr-only">
            {isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          </span>
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/shop/${product.id}`}>
          <h3 className="mb-1 line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          {product.description ? (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-lg font-bold text-brand">{formatPrice(product.price)}</p>
          <Button size="sm" className="rounded-full shadow-sm" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4" />
            <span className="sr-only">Add to cart</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
