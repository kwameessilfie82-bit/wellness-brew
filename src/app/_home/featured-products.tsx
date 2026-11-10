"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { StoreProduct } from "@/lib/products/normalize";
import { Button } from "@/ui/primitives/button";
import { ProductCard } from "@/ui/product-card";

export function FeaturedProducts() {
  const [featuredProducts, setFeaturedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch("/api/products/featured");
        const data = await response.json();
        if (data.products && Array.isArray(data.products)) {
          setFeaturedProducts((data.products as StoreProduct[]).slice(0, 4));
        }
      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
        <p className="text-muted-foreground">New blends arriving soon. Visit the shop to explore.</p>
        <Link href="/shop" className="mt-4 inline-block">
          <Button variant="outline" className="rounded-full">
            Browse shop
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {featuredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            description: product.shortDescription || product.description || undefined,
            category: product.categoryName || undefined,
          }}
        />
      ))}
    </div>
  );
}
